"""
Comptabilite views — chart of accounts, journal entries, transactions,
balance sheet, P&L reports.
"""
from datetime import datetime
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from rest_framework.exceptions import NotFound

from apps.comptabilite.models import Account, JournalEntry, Transaction
from apps.comptabilite.serializers import (
    AccountSerializer, JournalEntrySerializer, TransactionSerializer
)


def _auto_je_number():
    year = datetime.utcnow().year
    count = JournalEntry.objects(number__startswith=f'JE-{year}').count() + 1
    return f'JE-{year}-{count:05d}'


# ─── Account / Chart of Accounts ─────────────────────────────────────────────

class AccountListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Account.objects.all()
        account_type = request.query_params.get('type')
        if account_type:
            qs = qs.filter(account_type=account_type)
        return Response(AccountSerializer(qs, many=True).data)

    def post(self, request):
        s = AccountSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        obj = s.create(s.validated_data)
        return Response(AccountSerializer(obj).data, status=status.HTTP_201_CREATED)


class AccountDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get(self, pk):
        obj = Account.objects(id=pk).first()
        if not obj:
            raise NotFound('Account not found.')
        return obj

    def get(self, request, pk):
        return Response(AccountSerializer(self._get(pk)).data)

    def patch(self, request, pk):
        obj = self._get(pk)
        s = AccountSerializer(obj, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        return Response(AccountSerializer(s.update(obj, s.validated_data)).data)

    def delete(self, request, pk):
        self._get(pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ─── Journal Entry views ──────────────────────────────────────────────────────

class JournalEntryListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = JournalEntry.objects.all()
        entry_status = request.query_params.get('status')
        if entry_status:
            qs = qs.filter(entry_status=entry_status)
        date_from = request.query_params.get('date_from')
        if date_from:
            try:
                qs = qs.filter(date__gte=datetime.fromisoformat(date_from))
            except ValueError:
                pass
        date_to = request.query_params.get('date_to')
        if date_to:
            try:
                qs = qs.filter(date__lte=datetime.fromisoformat(date_to))
            except ValueError:
                pass
        return Response(JournalEntrySerializer(qs.limit(200), many=True).data)

    def post(self, request):
        data = request.data.copy()
        data.setdefault('number', _auto_je_number())
        data.setdefault('created_by_id', str(request.user.id))
        s = JournalEntrySerializer(data=data)
        s.is_valid(raise_exception=True)
        entry = s.create(s.validated_data)
        return Response(JournalEntrySerializer(entry).data, status=status.HTTP_201_CREATED)


class JournalEntryDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get(self, pk):
        obj = JournalEntry.objects(id=pk).first()
        if not obj:
            raise NotFound('Journal entry not found.')
        return obj

    def get(self, request, pk):
        return Response(JournalEntrySerializer(self._get(pk)).data)

    def patch(self, request, pk):
        obj = self._get(pk)
        if obj.entry_status == 'posted':
            return Response(
                {'detail': 'Posted entries cannot be modified. Create a reversing entry.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        s = JournalEntrySerializer(obj, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        return Response(JournalEntrySerializer(s.update(obj, s.validated_data)).data)

    def delete(self, request, pk):
        obj = self._get(pk)
        if obj.entry_status == 'posted':
            return Response({'detail': 'Posted entries cannot be deleted.'}, status=status.HTTP_400_BAD_REQUEST)
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class PostJournalEntryView(APIView):
    """Post (validate) a draft journal entry."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        entry = JournalEntry.objects(id=pk).first()
        if not entry:
            raise NotFound('Journal entry not found.')
        if entry.entry_status != 'draft':
            return Response({'detail': 'Only draft entries can be posted.'}, status=status.HTTP_400_BAD_REQUEST)
        if not entry.is_balanced:
            return Response({'detail': 'Entry is not balanced.'}, status=status.HTTP_400_BAD_REQUEST)
        now = datetime.utcnow()
        JournalEntry.objects(id=pk).update_one(
            set__entry_status='posted',
            set__posted_at=now,
            set__updated_at=now,
        )
        return Response({'detail': 'Journal entry posted successfully.'})


# ─── Transaction views ────────────────────────────────────────────────────────

class TransactionListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Transaction.objects.all()
        account_code = request.query_params.get('account_code')
        if account_code:
            qs = qs.filter(account_code=account_code)
        return Response(TransactionSerializer(qs.limit(500), many=True).data)


# ─── Reporting views ──────────────────────────────────────────────────────────

class BalanceSheetView(APIView):
    """Simplified balance sheet from posted journal entry lines."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Aggregate debit/credit per account from posted entries
        pipeline = [
            {'$match': {'entry_status': 'posted'}},
            {'$unwind': '$lines'},
            {'$group': {
                '_id': {
                    'account_code': '$lines.account_code',
                    'account_name': '$lines.account_name',
                    'entry_type': '$lines.entry_type',
                },
                'total': {'$sum': '$lines.amount'},
            }},
        ]
        rows = list(JournalEntry.objects.aggregate(*pipeline))
        return Response({'rows': rows})


class ProfitLossView(APIView):
    """Simplified P&L — revenue minus expense accounts."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        match_stage = {'entry_status': 'posted'}
        if date_from:
            match_stage['date__gte'] = datetime.fromisoformat(date_from)
        if date_to:
            match_stage['date__lte'] = datetime.fromisoformat(date_to)

        pipeline = [
            {'$match': match_stage},
            {'$unwind': '$lines'},
            {'$lookup': {
                'from': 'accounts',
                'localField': 'lines.account_code',
                'foreignField': 'code',
                'as': 'account_info',
            }},
            {'$unwind': {'path': '$account_info', 'preserveNullAndEmptyArrays': True}},
            {'$match': {'account_info.account_type': {'$in': ['revenue', 'expense']}}},
            {'$group': {
                '_id': {
                    'account_type': '$account_info.account_type',
                    'account_code': '$lines.account_code',
                    'account_name': '$lines.account_name',
                },
                'total_debit': {'$sum': {'$cond': [{'$eq': ['$lines.entry_type', 'debit']}, '$lines.amount', 0]}},
                'total_credit': {'$sum': {'$cond': [{'$eq': ['$lines.entry_type', 'credit']}, '$lines.amount', 0]}},
            }},
        ]
        rows = list(JournalEntry.objects.aggregate(*pipeline))
        return Response({'rows': rows})
