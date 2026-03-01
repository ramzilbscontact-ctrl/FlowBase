from rest_framework import serializers
from apps.comptabilite.models import Account, JournalEntry, JournalEntryLine, Transaction


class AccountSerializer(serializers.Serializer):
    id = serializers.SerializerMethodField()
    code = serializers.CharField(max_length=20)
    name = serializers.CharField(max_length=300)
    account_type = serializers.ChoiceField(choices=['asset', 'liability', 'equity', 'revenue', 'expense'])
    parent_code = serializers.CharField(max_length=20, required=False, allow_null=True, allow_blank=True)
    is_active = serializers.BooleanField(default=True)
    description = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    created_at = serializers.DateTimeField(read_only=True)

    def get_id(self, obj):
        return str(obj.id)

    def create(self, validated_data):
        return Account(**validated_data).save()

    def update(self, instance, validated_data):
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()
        return instance


class JournalEntryLineSerializer(serializers.Serializer):
    account_code = serializers.CharField(max_length=20)
    account_name = serializers.CharField(max_length=300, required=False, allow_blank=True)
    entry_type = serializers.ChoiceField(choices=['debit', 'credit'])
    amount = serializers.DecimalField(max_digits=15, decimal_places=2)
    label = serializers.CharField(max_length=500, required=False, allow_null=True, allow_blank=True)


class JournalEntrySerializer(serializers.Serializer):
    id = serializers.SerializerMethodField()
    number = serializers.CharField(max_length=50)
    date = serializers.DateTimeField()
    description = serializers.CharField(max_length=1000)
    lines = JournalEntryLineSerializer(many=True)
    entry_status = serializers.ChoiceField(choices=['draft', 'posted', 'cancelled'], default='draft')
    reference = serializers.CharField(max_length=200, required=False, allow_null=True, allow_blank=True)
    reference_type = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    created_by_id = serializers.CharField(required=False, allow_null=True)
    total_debit = serializers.SerializerMethodField()
    total_credit = serializers.SerializerMethodField()
    is_balanced = serializers.SerializerMethodField()
    posted_at = serializers.DateTimeField(read_only=True, allow_null=True)
    created_at = serializers.DateTimeField(read_only=True)

    def get_id(self, obj):
        return str(obj.id)

    def get_total_debit(self, obj):
        return obj.total_debit

    def get_total_credit(self, obj):
        return obj.total_credit

    def get_is_balanced(self, obj):
        return obj.is_balanced

    def validate(self, data):
        lines = data.get('lines', [])
        if not lines:
            raise serializers.ValidationError('Journal entry must have at least one line.')
        total_d = sum(float(l['amount']) for l in lines if l['entry_type'] == 'debit')
        total_c = sum(float(l['amount']) for l in lines if l['entry_type'] == 'credit')
        if abs(total_d - total_c) > 0.01:
            raise serializers.ValidationError(
                f'Journal entry is not balanced: debit={total_d}, credit={total_c}'
            )
        return data

    def create(self, validated_data):
        lines_data = validated_data.pop('lines', [])
        entry = JournalEntry(**validated_data)
        # Enrich account_name from chart of accounts
        for line_data in lines_data:
            if not line_data.get('account_name'):
                acc = Account.objects(code=line_data['account_code']).first()
                if acc:
                    line_data['account_name'] = acc.name
        entry.lines = [JournalEntryLine(**l) for l in lines_data]
        entry.save()
        return entry

    def update(self, instance, validated_data):
        from datetime import datetime
        lines_data = validated_data.pop('lines', None)
        validated_data['updated_at'] = datetime.utcnow()
        for k, v in validated_data.items():
            setattr(instance, k, v)
        if lines_data is not None:
            instance.lines = [JournalEntryLine(**l) for l in lines_data]
        instance.save()
        return instance


class TransactionSerializer(serializers.Serializer):
    id = serializers.SerializerMethodField()
    date = serializers.DateTimeField()
    description = serializers.CharField(max_length=1000)
    amount = serializers.DecimalField(max_digits=15, decimal_places=2)
    transaction_type = serializers.ChoiceField(choices=['debit', 'credit'])
    account_code = serializers.CharField(max_length=20)
    balance_after = serializers.DecimalField(max_digits=15, decimal_places=2, required=False, allow_null=True)
    reconciled = serializers.BooleanField(default=False)
    created_at = serializers.DateTimeField(read_only=True)

    def get_id(self, obj):
        return str(obj.id)
