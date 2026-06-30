import React, { useEffect, useRef } from 'react';
import { loginWithGoogleGIS } from '../../firebase';

interface GoogleLoginButtonProps {
  onSuccess: (user: any) => void;
  onError: (error: any) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({ onSuccess, onError, isLoading, setIsLoading }) => {
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if google is available
    if ((window as any).google) {
      (window as any).google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: async (response: any) => {
          setIsLoading(true);
          try {
            const user = await loginWithGoogleGIS(response.credential);
            onSuccess(user);
          } catch (err) {
            onError(err);
          } finally {
            setIsLoading(false);
          }
        },
      });

      (window as any).google.accounts.id.renderButton(
        buttonRef.current,
        { theme: 'outline', size: 'large', type: 'standard', width: '300' }
      );
    }
  }, [onSuccess, onError, setIsLoading]);

  return <div ref={buttonRef} />;
};

export default GoogleLoginButton;
