"""
Authentication serializers.
We use plain rest_framework.serializers.Serializer (not ModelSerializer)
because MongoEngine Documents are not Django ORM models.
"""
import bcrypt
from rest_framework import serializers

from apps.authentication.models import User, ROLE_CHOICES


# ─── Helpers ──────────────────────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def check_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


# ─── Serializers ──────────────────────────────────────────────────────────────

class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, write_only=True)
    first_name = serializers.CharField(max_length=100, default='')
    last_name = serializers.CharField(max_length=100, default='')
    role = serializers.ChoiceField(choices=ROLE_CHOICES, default='viewer')

    def validate_email(self, value):
        value = value.lower().strip()
        if User.objects(email=value).first():
            raise serializers.ValidationError('A user with this email already exists.')
        return value

    def create(self, validated_data):
        validated_data['email'] = validated_data['email'].lower().strip()
        validated_data['password'] = hash_password(validated_data.pop('password'))
        user = User(**validated_data)
        user.save()
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    totp_code = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        email = data['email'].lower().strip()
        user = User.objects(email=email, is_active=True).first()

        if not user:
            raise serializers.ValidationError('Invalid credentials.')

        if not check_password(data['password'], user.password):
            # Increment failed attempts
            User.objects(id=user.id).update_one(inc__failed_login_attempts=1)
            raise serializers.ValidationError('Invalid credentials.')

        if user.totp_enabled:
            totp_code = data.get('totp_code', '')
            if not totp_code:
                raise serializers.ValidationError('2FA code is required.')
            if not user.verify_totp(totp_code):
                raise serializers.ValidationError('Invalid 2FA code.')

        # Reset failed attempts on successful login
        User.objects(id=user.id).update_one(set__failed_login_attempts=0)

        data['user'] = user
        return data


class UserSerializer(serializers.Serializer):
    id = serializers.SerializerMethodField()
    email = serializers.EmailField(read_only=True)
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    role = serializers.CharField(read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    totp_enabled = serializers.BooleanField(read_only=True)
    date_joined = serializers.DateTimeField(read_only=True)
    last_login = serializers.DateTimeField(read_only=True)

    def get_id(self, obj):
        return str(obj.id)

    def update(self, instance, validated_data):
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        return instance


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(min_length=8, write_only=True)

    def validate(self, data):
        user = self.context['request'].user
        if not check_password(data['old_password'], user.password):
            raise serializers.ValidationError('Current password is incorrect.')
        return data


class TOTPSetupSerializer(serializers.Serializer):
    """Used when enabling 2FA — client must confirm with a valid code."""
    totp_code = serializers.CharField(min_length=6, max_length=6)
