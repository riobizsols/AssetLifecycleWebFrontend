import AppRoutes from "./routes/AppRoutes";
import { Toaster } from "react-hot-toast";

const App = () => {
  return (
    <>
      <AppRoutes />
      <Toaster
        position="bottom-right"
        reverseOrder={false}
        gutter={12}
        containerClassName="!fixed"
        containerStyle={{
          bottom: '40px',
          right: '40px',
        }}
        toastOptions={{
          duration: 4000,
          style: {
            minWidth: '300px',
            maxWidth: '500px',
            background: '#1E293B',
            color: 'white',
            padding: '16px 24px',
            fontSize: '14px',
            fontWeight: '500',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          },
          success: {
            style: {
              background: '#064E3B',
              border: '1px solid rgba(110, 231, 183, 0.3)',
            },
            iconTheme: {
              primary: '#34D399',
              secondary: '#064E3B',
            },
          },
          error: {
            style: {
              background: '#7F1D1D',
              border: '1px solid rgba(252, 165, 165, 0.3)',
            },
            iconTheme: {
              primary: '#F87171',
              secondary: '#7F1D1D',
            },
          },
          custom: {
            style: {
              animation: 'toast-enter 0.3s ease-out',
            },
          },
        }}
      />
      <style>
        {`
          @keyframes toast-enter {
            0% {
              transform: translateY(20px);
              opacity: 0;
            }
            100% {
              transform: translateY(0);
              opacity: 1;
            }
          }
          .go2072408551 {
            border-radius: 8px !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
          }
        `}
      </style>
    </>
  );
};

export default App;
