from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import status
from core.supabase import supabase, supabase_anon
from .firebase_service import get_user_by_email, get_user_by_mobile, get_user_by_username, create_user, get_user_by_id, get_position_by_id
from .otp_service import store_pending_registration, get_pending_registration, mark_registration_verified, clear_pending_registration, mark_registration_completed
import hashlib


class SupabaseRegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        mobile_number = request.data.get('mobileNumber')
        role = request.data.get('role')

        if not email or not password or not mobile_number or not role:
            return Response({'error': 'All fields are required'}, status=status.HTTP_400_BAD_REQUEST)

        if get_user_by_mobile(mobile_number):
            return Response({'error': 'Mobile number already exists'}, status=status.HTTP_400_BAD_REQUEST)

        if get_user_by_email(email):
            return Response({'error': 'Email already exists'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            res = supabase.auth.sign_up({'email': email, 'password': password})
            if res.user is None:
                return Response({'error': 'Failed to create Supabase account'}, status=status.HTTP_400_BAD_REQUEST)

            double_hash = hashlib.sha256(password.encode()).hexdigest()
            store_pending_registration(mobile_number, {
                'mobileNumber': mobile_number,
                'email': email,
                'passwordHash': double_hash,
                'role': role,
                'isPending': role == 'extension_worker',
                'supabaseId': res.user.id,
            })
            return Response({'message': 'OTP sent to email'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SupabaseVerifyOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        token = request.data.get('otp')
        mobile_number = request.data.get('mobileNumber')
        is_registration = request.data.get('isRegistration', False)

        if not email or not token:
            return Response({'error': 'email and otp are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            res = supabase.auth.verify_otp({'email': email, 'token': token, 'type': 'signup'})
            if res.user is None:
                return Response({'error': 'Invalid or expired OTP'}, status=status.HTTP_400_BAD_REQUEST)

            if is_registration and mobile_number:
                user_data = get_pending_registration(mobile_number)
                if not user_data:
                    return Response({'error': 'Registration data expired. Please register again.'}, status=status.HTTP_400_BAD_REQUEST)
                mark_registration_verified(mobile_number)

            return Response({'message': 'OTP verified successfully'})
        except Exception as e:
            return Response({'error': 'Invalid or expired OTP'}, status=status.HTTP_400_BAD_REQUEST)


class SupabaseLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        remember_me = request.data.get('rememberMe', False)

        if not email or not password:
            return Response({'error': 'Email and password are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            res = supabase_anon.auth.sign_in_with_password({'email': email, 'password': password})
            if res.user is None:
                return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

            user = get_user_by_email(email)
            if not user:
                return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

            if not user.get('isActive'):
                return Response({'error': 'Account is disabled'}, status=status.HTTP_401_UNAUTHORIZED)

            if user.get('isPending'):
                return Response({'error': 'Account is pending approval', 'isPending': True}, status=status.HTTP_403_FORBIDDEN)

            position_name = ''
            if user.get('positionId'):
                pos = get_position_by_id(user['positionId'])
                position_name = pos['name'] if pos else ''

            return Response({
                'access': res.session.access_token,
                'refresh': res.session.refresh_token,
                'user': {
                    'id': user['id'],
                    'firstName': user['firstName'],
                    'lastName': user['lastName'],
                    'role': user['role'],
                    'email': user.get('email', ''),
                    'mobileNumber': user['mobileNumber'],
                    'profilePicture': user.get('profilePicture', ''),
                    'barangay': user.get('barangay', ''),
                    'positionName': position_name,
                }
            })
        except Exception as e:
            return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)


class SupabaseUpdatePasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        if not email or not password:
            return Response({'error': 'email and password are required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            user = get_user_by_email(email)
            if not user:
                return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
            res = supabase.auth.admin.list_users()
            supabase_user = next((u for u in res if u.email == email), None)
            if not supabase_user:
                return Response({'error': 'Supabase user not found'}, status=status.HTTP_404_NOT_FOUND)
            supabase.auth.admin.update_user_by_id(supabase_user.id, {'password': password})
            return Response({'message': 'Password updated successfully'})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SupabaseForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)

        user = get_user_by_email(email)
        if not user:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        try:
            return Response({'message': 'Password reset email sent'})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SupabaseResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        access_token = request.data.get('accessToken')
        new_password = request.data.get('password')

        if not access_token or not new_password:
            return Response({'error': 'accessToken and password are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            res = supabase_anon.auth.exchange_code_for_session({'auth_code': access_token})
            if res.session:
                supabase_anon.auth.update_user({'password': new_password})
            else:
                supabase.auth.set_session(access_token, '')
                supabase.auth.update_user({'password': new_password})
            return Response({'message': 'Password reset successfully'})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SupabaseMeView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return Response({'error': 'No token'}, status=status.HTTP_401_UNAUTHORIZED)

        token = auth_header.split(' ')[1]
        try:
            res = supabase.auth.get_user(token)
            if res.user is None:
                return Response({'error': 'Invalid token'}, status=status.HTTP_401_UNAUTHORIZED)

            user = get_user_by_email(res.user.email)
            if not user:
                return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

            position_name = ''
            if user.get('positionId'):
                pos = get_position_by_id(user['positionId'])
                position_name = pos['name'] if pos else ''

            return Response({
                'id': user['id'],
                'firstName': user['firstName'],
                'lastName': user['lastName'],
                'role': user['role'],
                'email': user.get('email', ''),
                'mobileNumber': user['mobileNumber'],
                'profilePicture': user.get('profilePicture', ''),
                'barangay': user.get('barangay', ''),
                'positionName': position_name,
            })
        except Exception:
            # fallback to custom JWT for admin
            try:
                from rest_framework_simplejwt.tokens import AccessToken
                decoded = AccessToken(token)
                user = get_user_by_id(decoded['user_id'])
                if not user:
                    return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
                position_name = ''
                if user.get('positionId'):
                    pos = get_position_by_id(user['positionId'])
                    position_name = pos['name'] if pos else ''
                return Response({
                    'id': user['id'],
                    'firstName': user['firstName'],
                    'lastName': user['lastName'],
                    'role': user['role'],
                    'email': user.get('email', ''),
                    'mobileNumber': user['mobileNumber'],
                    'profilePicture': user.get('profilePicture', ''),
                    'barangay': user.get('barangay', ''),
                    'positionName': position_name,
                })
            except Exception:
                return Response({'error': 'Invalid token'}, status=status.HTTP_401_UNAUTHORIZED)
