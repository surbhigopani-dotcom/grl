import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Home, ArrowLeft } from 'lucide-react';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
      <div className="text-center text-white max-w-2xl">
        <div className="text-9xl font-bold mb-4 opacity-50">404</div>
        <h1 className="text-2xl md:text-5xl font-bold mb-4">Page Not Found</h1>
        <p className="text-xl mb-8 text-white/80">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={() => navigate('/')}
            className="gradient-primary text-primary-foreground hover:opacity-90"
            size="lg"
          >
            <Home className="mr-2 w-5 h-5" />
            Go to Home
          </Button>
          <Button
            onClick={() => navigate(-1)}
            variant="outline"
            className="bg-white/10 border-white text-white hover:bg-white hover:text-primary"
            size="lg"
          >
            <ArrowLeft className="mr-2 w-5 h-5" />
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;

