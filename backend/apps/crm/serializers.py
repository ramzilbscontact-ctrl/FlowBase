"""
CRM serializers — plain DRF Serializer (not ModelSerializer).
"""
from rest_framework import serializers
from apps.crm.models import Contact, Company, Deal, Pipeline, Task, Note


class CompanySerializer(serializers.Serializer):
    id = serializers.SerializerMethodField()
    name = serializers.CharField(max_length=255)
    website = serializers.URLField(required=False, allow_null=True, allow_blank=True)
    industry = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)
    phone = serializers.CharField(max_length=30, required=False, allow_blank=True, allow_null=True)
    email = serializers.EmailField(required=False, allow_null=True, allow_blank=True)
    address = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    city = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)
    country = serializers.CharField(max_length=100, default='Algeria')
    notes = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    owner_id = serializers.CharField(required=False, allow_null=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)

    def get_id(self, obj):
        return str(obj.id)

    def create(self, validated_data):
        return Company(**validated_data).save()

    def update(self, instance, validated_data):
        from datetime import datetime
        validated_data['updated_at'] = datetime.utcnow()
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()
        return instance


class ContactSerializer(serializers.Serializer):
    id = serializers.SerializerMethodField()
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    email = serializers.EmailField(required=False, allow_null=True, allow_blank=True)
    phone = serializers.CharField(max_length=30, required=False, allow_blank=True, allow_null=True)
    mobile = serializers.CharField(max_length=30, required=False, allow_blank=True, allow_null=True)
    job_title = serializers.CharField(max_length=150, required=False, allow_blank=True, allow_null=True)
    company_id = serializers.SerializerMethodField()
    company_name = serializers.CharField(max_length=255, required=False, allow_blank=True, allow_null=True)
    tags = serializers.ListField(child=serializers.CharField(max_length=50), default=list)
    source = serializers.CharField(max_length=100, required=False, allow_null=True, allow_blank=True)
    notes = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    owner_id = serializers.CharField(required=False, allow_null=True)
    avatar_url = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    linkedin_url = serializers.URLField(required=False, allow_null=True, allow_blank=True)
    instagram_handle = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)
    whatsapp_number = serializers.CharField(max_length=30, required=False, allow_blank=True, allow_null=True)
    full_name = serializers.SerializerMethodField()
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)

    def get_id(self, obj):
        return str(obj.id)

    def get_company_id(self, obj):
        if obj.company:
            return str(obj.company.id)
        return None

    def get_full_name(self, obj):
        return obj.full_name

    def create(self, validated_data):
        company_id = self.initial_data.get('company_id')
        if company_id:
            company = Company.objects(id=company_id).first()
            if company:
                validated_data['company'] = company
                validated_data.setdefault('company_name', company.name)
        return Contact(**validated_data).save()

    def update(self, instance, validated_data):
        from datetime import datetime
        validated_data['updated_at'] = datetime.utcnow()
        company_id = self.initial_data.get('company_id')
        if company_id:
            company = Company.objects(id=company_id).first()
            if company:
                instance.company = company
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()
        return instance


class PipelineSerializer(serializers.Serializer):
    id = serializers.SerializerMethodField()
    name = serializers.CharField(max_length=200)
    description = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    owner_id = serializers.CharField(required=False, allow_null=True)
    is_default = serializers.BooleanField(default=False)
    created_at = serializers.DateTimeField(read_only=True)

    def get_id(self, obj):
        return str(obj.id)

    def create(self, validated_data):
        return Pipeline(**validated_data).save()

    def update(self, instance, validated_data):
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()
        return instance


class DealSerializer(serializers.Serializer):
    id = serializers.SerializerMethodField()
    title = serializers.CharField(max_length=300)
    contact_id = serializers.SerializerMethodField()
    company_id = serializers.SerializerMethodField()
    pipeline_id = serializers.SerializerMethodField()
    stage = serializers.ChoiceField(choices=['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'])
    value = serializers.DecimalField(max_digits=15, decimal_places=2, default=0)
    currency = serializers.CharField(max_length=3, default='DZD')
    probability = serializers.IntegerField(min_value=0, max_value=100, default=20)
    expected_close_date = serializers.DateTimeField(required=False, allow_null=True)
    closed_at = serializers.DateTimeField(read_only=True, allow_null=True)
    owner_id = serializers.CharField(required=False, allow_null=True)
    description = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    tags = serializers.ListField(child=serializers.CharField(max_length=50), default=list)
    ai_score = serializers.FloatField(read_only=True, allow_null=True)
    ai_score_updated_at = serializers.DateTimeField(read_only=True, allow_null=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)

    def get_id(self, obj):
        return str(obj.id)

    def get_contact_id(self, obj):
        return str(obj.contact.id) if obj.contact else None

    def get_company_id(self, obj):
        return str(obj.company.id) if obj.company else None

    def get_pipeline_id(self, obj):
        return str(obj.pipeline.id) if obj.pipeline else None

    def _resolve_refs(self, validated_data):
        for field, model in [
            ('contact_id', Contact),
            ('company_id', Company),
            ('pipeline_id', Pipeline),
        ]:
            ref_id = self.initial_data.get(field)
            key = field.replace('_id', '')
            if ref_id:
                obj = model.objects(id=ref_id).first()
                validated_data[key] = obj
        return validated_data

    def create(self, validated_data):
        from datetime import datetime
        validated_data = self._resolve_refs(validated_data)
        deal = Deal(**validated_data)
        if deal.stage == 'won' and not deal.closed_at:
            deal.closed_at = datetime.utcnow()
        deal.save()
        return deal

    def update(self, instance, validated_data):
        from datetime import datetime
        validated_data = self._resolve_refs(validated_data)
        validated_data['updated_at'] = datetime.utcnow()
        for k, v in validated_data.items():
            setattr(instance, k, v)
        if instance.stage in ('won', 'lost') and not instance.closed_at:
            instance.closed_at = datetime.utcnow()
        instance.save()
        return instance


class TaskSerializer(serializers.Serializer):
    id = serializers.SerializerMethodField()
    title = serializers.CharField(max_length=300)
    description = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    status = serializers.ChoiceField(choices=['todo', 'in_progress', 'done', 'cancelled'], default='todo')
    priority = serializers.ChoiceField(choices=['low', 'medium', 'high', 'urgent'], default='medium')
    due_date = serializers.DateTimeField(required=False, allow_null=True)
    completed_at = serializers.DateTimeField(read_only=True, allow_null=True)
    related_type = serializers.ChoiceField(
        choices=['contact', 'deal', 'company'],
        required=False, allow_null=True,
    )
    related_id = serializers.CharField(required=False, allow_null=True)
    assigned_to_id = serializers.CharField(required=False, allow_null=True)
    created_by_id = serializers.CharField(required=False, allow_null=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)

    def get_id(self, obj):
        return str(obj.id)

    def create(self, validated_data):
        return Task(**validated_data).save()

    def update(self, instance, validated_data):
        from datetime import datetime
        validated_data['updated_at'] = datetime.utcnow()
        if validated_data.get('status') == 'done' and not instance.completed_at:
            validated_data['completed_at'] = datetime.utcnow()
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()
        return instance


class NoteSerializer(serializers.Serializer):
    id = serializers.SerializerMethodField()
    content = serializers.CharField()
    related_type = serializers.ChoiceField(
        choices=['contact', 'deal', 'company'],
        required=False, allow_null=True,
    )
    related_id = serializers.CharField(required=False, allow_null=True)
    author_id = serializers.CharField(required=False, allow_null=True)
    is_pinned = serializers.BooleanField(default=False)
    attachments = serializers.ListField(child=serializers.CharField(), default=list)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)

    def get_id(self, obj):
        return str(obj.id)

    def create(self, validated_data):
        return Note(**validated_data).save()

    def update(self, instance, validated_data):
        from datetime import datetime
        validated_data['updated_at'] = datetime.utcnow()
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()
        return instance
