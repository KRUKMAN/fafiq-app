import React from 'react';
import { View } from 'react-native';

import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/Button';
import { StatusMessage } from '@/components/ui/StatusMessage';

type Props = {
  children: React.ReactNode;
};

type State = {
  error: Error | null;
};

export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    logger.error('Unhandled render error', { err: error, componentStack: info.componentStack });
  }

  private handleTryAgain = () => {
    this.setState({ error: null });
  };

  private handleReload = () => {
    try {
      if (typeof window !== 'undefined' && typeof window.location?.reload === 'function') {
        window.location.reload();
        return;
      }
    } catch {
      // ignore
    }
    this.handleTryAgain();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <View className="flex-1 items-center justify-center px-4">
        <StatusMessage variant="error" message="Something went wrong. You can try again or reload the app." />
        <View className="h-3" />
        <View className="flex-row gap-3">
          <Button variant="secondary" onPress={this.handleTryAgain}>
            Try again
          </Button>
          <Button variant="primary" onPress={this.handleReload}>
            Reload
          </Button>
        </View>
      </View>
    );
  }
}

