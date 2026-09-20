import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { setNavigator } from '../core/routing/navigation';

// Registers the Router's navigate() as the one path 401 handling and other
// non-component code use to redirect, instead of window.location.href.
export default function NavigationBridge() {
  const navigate = useNavigate();

  useEffect(() => {
    setNavigator(navigate);
  }, [navigate]);

  return null;
}
