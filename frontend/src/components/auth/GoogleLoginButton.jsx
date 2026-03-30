import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "@/lib/contexts/AuthContext";

export default function GoogleLoginButton({ onSuccess, onError }) {
  const { loginWithGoogle } = useAuth();

  const handleSuccess = async (credentialResponse) => {
    try {
      await loginWithGoogle(credentialResponse.credential);
      onSuccess?.();
    } catch (err) {
      console.error("Google login error:", err);
      onError?.(err.message || "Google login failed");
    }
  };

  const handleError = () => {
    onError?.("Google authentication failed. Please try again.");
  };

  return (
    <div className="w-full flex justify-center">
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={handleError}
        useOneTap={false}
        theme="outline"
        size="large"
        width="100%"
        text="continue_with"
        shape="rectangular"
      />
    </div>
  );
}
