from rest_framework import serializers
from apps.rh_paie.models import Employee, Department, Payslip, LeaveRequest, PayrollComponent


class DepartmentSerializer(serializers.Serializer):
    id = serializers.SerializerMethodField()
    name = serializers.CharField(max_length=200)
    description = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    manager_id = serializers.CharField(required=False, allow_null=True)
    created_at = serializers.DateTimeField(read_only=True)

    def get_id(self, obj):
        return str(obj.id)

    def create(self, validated_data):
        return Department(**validated_data).save()

    def update(self, instance, validated_data):
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()
        return instance


class EmployeeSerializer(serializers.Serializer):
    id = serializers.SerializerMethodField()
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=30, required=False, allow_null=True, allow_blank=True)
    date_of_birth = serializers.DateTimeField(required=False, allow_null=True)
    national_id = serializers.CharField(max_length=50, required=False, allow_null=True, allow_blank=True)
    employee_id = serializers.CharField(max_length=50)
    post = serializers.CharField(max_length=200, required=False, allow_null=True, allow_blank=True)
    department_id = serializers.SerializerMethodField()
    employment_type = serializers.ChoiceField(
        choices=['full_time', 'part_time', 'contract', 'intern', 'freelance'],
        default='full_time',
    )
    emp_status = serializers.ChoiceField(
        choices=['active', 'on_leave', 'terminated', 'suspended'],
        default='active',
    )
    hire_date = serializers.DateTimeField(required=False, allow_null=True)
    termination_date = serializers.DateTimeField(required=False, allow_null=True)
    manager_id = serializers.CharField(required=False, allow_null=True)
    base_salary = serializers.DecimalField(max_digits=15, decimal_places=2, default=0)
    currency = serializers.CharField(max_length=3, default='DZD')
    bank_account = serializers.CharField(max_length=100, required=False, allow_null=True, allow_blank=True)
    user_id = serializers.CharField(required=False, allow_null=True)
    full_name = serializers.SerializerMethodField()
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)

    def get_id(self, obj):
        return str(obj.id)

    def get_department_id(self, obj):
        return str(obj.department.id) if obj.department else None

    def get_full_name(self, obj):
        return obj.full_name

    def create(self, validated_data):
        dept_id = self.initial_data.get('department_id')
        if dept_id:
            dept = Department.objects(id=dept_id).first()
            if dept:
                validated_data['department'] = dept
        return Employee(**validated_data).save()

    def update(self, instance, validated_data):
        from datetime import datetime
        validated_data['updated_at'] = datetime.utcnow()
        dept_id = self.initial_data.get('department_id')
        if dept_id:
            dept = Department.objects(id=dept_id).first()
            if dept:
                instance.department = dept
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()
        return instance


class PayrollComponentSerializer(serializers.Serializer):
    label = serializers.CharField(max_length=200)
    component_type = serializers.ChoiceField(choices=['earning', 'deduction'])
    amount = serializers.DecimalField(max_digits=15, decimal_places=2)
    is_taxable = serializers.BooleanField(default=True)


class PayslipSerializer(serializers.Serializer):
    id = serializers.SerializerMethodField()
    employee_id = serializers.SerializerMethodField()
    employee_name = serializers.CharField(read_only=True)
    period_month = serializers.IntegerField(min_value=1, max_value=12)
    period_year = serializers.IntegerField()
    components = PayrollComponentSerializer(many=True, default=list)
    gross_salary = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    total_deductions = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    net_salary = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    currency = serializers.CharField(max_length=3, default='DZD')
    payslip_status = serializers.ChoiceField(choices=['draft', 'validated', 'paid'], default='draft')
    paid_at = serializers.DateTimeField(read_only=True, allow_null=True)
    pdf_url = serializers.CharField(read_only=True, allow_null=True)
    created_at = serializers.DateTimeField(read_only=True)

    def get_id(self, obj):
        return str(obj.id)

    def get_employee_id(self, obj):
        return str(obj.employee.id) if obj.employee else None

    def create(self, validated_data):
        components_data = validated_data.pop('components', [])
        emp_ref_id = self.initial_data.get('employee_id')
        emp = Employee.objects(id=emp_ref_id).first() if emp_ref_id else None
        payslip = Payslip(employee=emp, **validated_data)
        payslip.employee_name = emp.full_name if emp else ''
        payslip.components = [PayrollComponent(**c) for c in components_data]
        # Start with base salary as first earning component if no components provided
        if not payslip.components and emp:
            payslip.components = [
                PayrollComponent(label='Salaire de base', component_type='earning', amount=emp.base_salary)
            ]
        payslip.recalculate()
        payslip.save()
        return payslip

    def update(self, instance, validated_data):
        from datetime import datetime
        components_data = validated_data.pop('components', None)
        validated_data['updated_at'] = datetime.utcnow()
        for k, v in validated_data.items():
            setattr(instance, k, v)
        if components_data is not None:
            instance.components = [PayrollComponent(**c) for c in components_data]
        instance.recalculate()
        instance.save()
        return instance


class LeaveRequestSerializer(serializers.Serializer):
    id = serializers.SerializerMethodField()
    employee_id = serializers.SerializerMethodField()
    leave_type = serializers.ChoiceField(
        choices=['annual', 'sick', 'maternity', 'paternity', 'unpaid', 'other'],
        default='annual',
    )
    start_date = serializers.DateTimeField()
    end_date = serializers.DateTimeField()
    days_count = serializers.FloatField(read_only=True)
    reason = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    leave_status = serializers.CharField(read_only=True)
    reviewed_by_id = serializers.CharField(read_only=True, allow_null=True)
    reviewed_at = serializers.DateTimeField(read_only=True, allow_null=True)
    review_comment = serializers.CharField(read_only=True, allow_null=True)
    created_at = serializers.DateTimeField(read_only=True)

    def get_id(self, obj):
        return str(obj.id)

    def get_employee_id(self, obj):
        return str(obj.employee.id) if obj.employee else None

    def validate(self, data):
        if data.get('end_date') and data.get('start_date'):
            if data['end_date'] < data['start_date']:
                raise serializers.ValidationError('end_date must be after start_date.')
        return data

    def create(self, validated_data):
        emp_id = self.initial_data.get('employee_id')
        emp = Employee.objects(id=emp_id).first() if emp_id else None
        if not emp:
            raise serializers.ValidationError({'employee_id': 'Employee not found.'})
        # Calculate working days (simple approximation)
        delta = (validated_data['end_date'] - validated_data['start_date']).days + 1
        leave = LeaveRequest(employee=emp, days_count=delta, **validated_data)
        leave.save()
        return leave
