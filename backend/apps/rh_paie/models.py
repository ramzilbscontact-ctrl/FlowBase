"""
RH & Paie models — MongoEngine Documents.
"""
import mongoengine as me
from datetime import datetime

EMPLOYMENT_TYPE = ('full_time', 'part_time', 'contract', 'intern', 'freelance')
EMPLOYEE_STATUS = ('active', 'on_leave', 'terminated', 'suspended')
LEAVE_TYPE = ('annual', 'sick', 'maternity', 'paternity', 'unpaid', 'other')
LEAVE_STATUS = ('pending', 'approved', 'rejected', 'cancelled')
PAYSLIP_STATUS = ('draft', 'validated', 'paid')


class Department(me.Document):
    name = me.StringField(required=True, max_length=200)
    description = me.StringField(null=True)
    manager_id = me.StringField(null=True)   # Employee.id
    created_at = me.DateTimeField(default=datetime.utcnow)

    meta = {'collection': 'departments'}

    def __str__(self):
        return self.name


class Employee(me.Document):
    # Personal info
    first_name = me.StringField(required=True, max_length=100)
    last_name = me.StringField(required=True, max_length=100)
    email = me.EmailField(unique=True, required=True)
    phone = me.StringField(max_length=30, null=True)
    date_of_birth = me.DateTimeField(null=True)
    national_id = me.StringField(max_length=50, null=True)  # CNI / NAS

    # Professional info
    employee_id = me.StringField(unique=True, required=True)  # e.g. EMP-001
    post = me.StringField(max_length=200, null=True)          # job title
    department = me.ReferenceField(Department, null=True, reverse_delete_rule=me.NULLIFY)
    employment_type = me.StringField(choices=EMPLOYMENT_TYPE, default='full_time')
    emp_status = me.StringField(choices=EMPLOYEE_STATUS, default='active')
    hire_date = me.DateTimeField(null=True)
    termination_date = me.DateTimeField(null=True)
    manager_id = me.StringField(null=True)   # Employee.id

    # Compensation
    base_salary = me.DecimalField(precision=2, default=0)
    currency = me.StringField(max_length=3, default='DZD')
    bank_account = me.StringField(max_length=100, null=True)  # IBAN

    # ERP user link
    user_id = me.StringField(null=True)    # apps.authentication.User.id

    created_at = me.DateTimeField(default=datetime.utcnow)
    updated_at = me.DateTimeField(default=datetime.utcnow)

    meta = {
        'collection': 'employees',
        'ordering': ['last_name', 'first_name'],
        'indexes': ['email', 'employee_id', 'emp_status'],
    }

    @property
    def full_name(self):
        return f'{self.first_name} {self.last_name}'

    def __str__(self):
        return f'{self.full_name} ({self.employee_id})'


class PayrollComponent(me.EmbeddedDocument):
    """A single earnings or deduction line on a payslip."""
    label = me.StringField(required=True, max_length=200)
    component_type = me.StringField(choices=('earning', 'deduction'), default='earning')
    amount = me.DecimalField(precision=2, default=0)
    is_taxable = me.BooleanField(default=True)


class Payslip(me.Document):
    employee = me.ReferenceField(Employee, required=True, reverse_delete_rule=me.NULLIFY)
    employee_name = me.StringField(max_length=200)      # denormalised
    period_month = me.IntField(min_value=1, max_value=12)
    period_year = me.IntField()
    components = me.ListField(me.EmbeddedDocumentField(PayrollComponent))
    gross_salary = me.DecimalField(precision=2, default=0)
    total_deductions = me.DecimalField(precision=2, default=0)
    net_salary = me.DecimalField(precision=2, default=0)
    currency = me.StringField(max_length=3, default='DZD')
    payslip_status = me.StringField(choices=PAYSLIP_STATUS, default='draft')
    paid_at = me.DateTimeField(null=True)
    pdf_url = me.StringField(null=True)
    validated_by_id = me.StringField(null=True)
    created_at = me.DateTimeField(default=datetime.utcnow)
    updated_at = me.DateTimeField(default=datetime.utcnow)

    meta = {
        'collection': 'payslips',
        'ordering': ['-period_year', '-period_month'],
        'indexes': ['employee', 'period_year', 'period_month', 'payslip_status'],
    }

    def recalculate(self):
        earnings = sum(
            float(c.amount) for c in self.components
            if c.component_type == 'earning'
        )
        deductions = sum(
            float(c.amount) for c in self.components
            if c.component_type == 'deduction'
        )
        self.gross_salary = earnings
        self.total_deductions = deductions
        self.net_salary = earnings - deductions

    def __str__(self):
        return f'Payslip {self.employee_name} — {self.period_month}/{self.period_year}'


class LeaveRequest(me.Document):
    employee = me.ReferenceField(Employee, required=True, reverse_delete_rule=me.CASCADE)
    leave_type = me.StringField(choices=LEAVE_TYPE, default='annual')
    start_date = me.DateTimeField(required=True)
    end_date = me.DateTimeField(required=True)
    days_count = me.FloatField(default=0)
    reason = me.StringField(null=True)
    leave_status = me.StringField(choices=LEAVE_STATUS, default='pending')
    reviewed_by_id = me.StringField(null=True)
    reviewed_at = me.DateTimeField(null=True)
    review_comment = me.StringField(null=True)
    created_at = me.DateTimeField(default=datetime.utcnow)

    meta = {
        'collection': 'leave_requests',
        'ordering': ['-created_at'],
        'indexes': ['employee', 'leave_status', 'start_date'],
    }

    def __str__(self):
        return f'{self.employee} — {self.leave_type} ({self.start_date} to {self.end_date})'
