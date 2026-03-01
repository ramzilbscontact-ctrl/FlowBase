"""
RH & Paie views — employees, departments, payslips, leave requests.
"""
from datetime import datetime
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from rest_framework.exceptions import NotFound

from apps.rh_paie.models import Employee, Department, Payslip, LeaveRequest
from apps.rh_paie.serializers import (
    EmployeeSerializer, DepartmentSerializer,
    PayslipSerializer, LeaveRequestSerializer,
)


# ─── Department views ─────────────────────────────────────────────────────────

class DepartmentListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(DepartmentSerializer(Department.objects.all(), many=True).data)

    def post(self, request):
        s = DepartmentSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        obj = s.create(s.validated_data)
        return Response(DepartmentSerializer(obj).data, status=status.HTTP_201_CREATED)


class DepartmentDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get(self, pk):
        obj = Department.objects(id=pk).first()
        if not obj:
            raise NotFound('Department not found.')
        return obj

    def get(self, request, pk):
        return Response(DepartmentSerializer(self._get(pk)).data)

    def patch(self, request, pk):
        obj = self._get(pk)
        s = DepartmentSerializer(obj, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        return Response(DepartmentSerializer(s.update(obj, s.validated_data)).data)

    def delete(self, request, pk):
        self._get(pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ─── Employee views ───────────────────────────────────────────────────────────

class EmployeeListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Employee.objects.all()
        emp_status = request.query_params.get('status')
        if emp_status:
            qs = qs.filter(emp_status=emp_status)
        dept = request.query_params.get('department_id')
        if dept:
            department = Department.objects(id=dept).first()
            if department:
                qs = qs.filter(department=department)
        return Response(EmployeeSerializer(qs, many=True).data)

    def post(self, request):
        s = EmployeeSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        emp = s.create(s.validated_data)
        return Response(EmployeeSerializer(emp).data, status=status.HTTP_201_CREATED)


class EmployeeDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get(self, pk):
        obj = Employee.objects(id=pk).first()
        if not obj:
            raise NotFound('Employee not found.')
        return obj

    def get(self, request, pk):
        return Response(EmployeeSerializer(self._get(pk)).data)

    def patch(self, request, pk):
        obj = self._get(pk)
        s = EmployeeSerializer(obj, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        return Response(EmployeeSerializer(s.update(obj, s.validated_data)).data)

    def delete(self, request, pk):
        # Soft-delete: just update status
        obj = self._get(pk)
        Employee.objects(id=pk).update_one(
            set__emp_status='terminated',
            set__termination_date=datetime.utcnow(),
        )
        return Response({'detail': 'Employee terminated.'})


# ─── Payslip views ────────────────────────────────────────────────────────────

class PayslipListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Payslip.objects.all()
        emp_id = request.query_params.get('employee_id')
        if emp_id:
            emp = Employee.objects(id=emp_id).first()
            if emp:
                qs = qs.filter(employee=emp)
        year = request.query_params.get('year')
        if year:
            qs = qs.filter(period_year=int(year))
        return Response(PayslipSerializer(qs, many=True).data)

    def post(self, request):
        s = PayslipSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        payslip = s.create(s.validated_data)
        return Response(PayslipSerializer(payslip).data, status=status.HTTP_201_CREATED)


class PayslipDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get(self, pk):
        obj = Payslip.objects(id=pk).first()
        if not obj:
            raise NotFound('Payslip not found.')
        return obj

    def get(self, request, pk):
        return Response(PayslipSerializer(self._get(pk)).data)

    def patch(self, request, pk):
        obj = self._get(pk)
        if obj.payslip_status == 'paid':
            return Response({'detail': 'Cannot modify a paid payslip.'}, status=status.HTTP_400_BAD_REQUEST)
        s = PayslipSerializer(obj, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        return Response(PayslipSerializer(s.update(obj, s.validated_data)).data)


class ValidatePayslipView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        payslip = Payslip.objects(id=pk).first()
        if not payslip:
            raise NotFound('Payslip not found.')
        if payslip.payslip_status != 'draft':
            return Response({'detail': 'Only draft payslips can be validated.'}, status=status.HTTP_400_BAD_REQUEST)
        Payslip.objects(id=pk).update_one(
            set__payslip_status='validated',
            set__validated_by_id=str(request.user.id),
            set__updated_at=datetime.utcnow(),
        )
        return Response({'detail': 'Payslip validated.'})


# ─── Leave request views ──────────────────────────────────────────────────────

class LeaveRequestListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = LeaveRequest.objects.all()
        leave_status = request.query_params.get('status')
        if leave_status:
            qs = qs.filter(leave_status=leave_status)
        emp_id = request.query_params.get('employee_id')
        if emp_id:
            emp = Employee.objects(id=emp_id).first()
            if emp:
                qs = qs.filter(employee=emp)
        return Response(LeaveRequestSerializer(qs, many=True).data)

    def post(self, request):
        s = LeaveRequestSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        leave = s.create(s.validated_data)
        return Response(LeaveRequestSerializer(leave).data, status=status.HTTP_201_CREATED)


class LeaveRequestDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get(self, pk):
        obj = LeaveRequest.objects(id=pk).first()
        if not obj:
            raise NotFound('Leave request not found.')
        return obj

    def get(self, request, pk):
        return Response(LeaveRequestSerializer(self._get(pk)).data)

    def delete(self, request, pk):
        obj = self._get(pk)
        if obj.leave_status not in ('pending',):
            return Response({'detail': 'Can only cancel pending requests.'}, status=status.HTTP_400_BAD_REQUEST)
        LeaveRequest.objects(id=pk).update_one(set__leave_status='cancelled')
        return Response({'detail': 'Leave request cancelled.'})


class ReviewLeaveRequestView(APIView):
    """Approve or reject a leave request."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        leave = LeaveRequest.objects(id=pk).first()
        if not leave:
            raise NotFound('Leave request not found.')
        decision = request.data.get('decision')
        if decision not in ('approved', 'rejected'):
            return Response({'detail': 'decision must be "approved" or "rejected".'}, status=status.HTTP_400_BAD_REQUEST)
        LeaveRequest.objects(id=pk).update_one(
            set__leave_status=decision,
            set__reviewed_by_id=str(request.user.id),
            set__reviewed_at=datetime.utcnow(),
            set__review_comment=request.data.get('comment', ''),
        )
        return Response({'detail': f'Leave request {decision}.'})
