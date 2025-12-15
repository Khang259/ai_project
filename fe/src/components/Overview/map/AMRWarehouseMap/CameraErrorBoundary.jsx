import React from 'react';

/**
 * Error Boundary Component for handling camera-related errors
 * Catches errors in child components and displays a fallback UI
 */
class CameraErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details for debugging
    console.error('🚨 Camera component error:', error, errorInfo);
    
    // You can also log the error to an error reporting service here
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    // Reset error state to retry rendering
    this.setState({ hasError: false, error: null });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={styles.errorContainer}>
          <div style={styles.errorTitle}>
            {this.props.errorTitle || 'Camera component error'}
          </div>
          <div style={styles.errorMessage}>
            {this.state.error?.message || 'Unknown error occurred'}
          </div>
          <button 
            onClick={this.handleRetry}
            style={styles.retryButton}
            onMouseOver={(e) => e.target.style.opacity = '0.8'}
            onMouseOut={(e) => e.target.style.opacity = '1'}
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Styles object for the error boundary UI
const styles = {
  errorContainer: {
    padding: '10px',
    color: '#721c24',
    backgroundColor: '#f8d7da',
    borderRadius: '4px',
    margin: '10px',
    border: '1px solid #f5c6cb',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  errorTitle: {
    fontWeight: 'bold',
    marginBottom: '5px',
    fontSize: '14px',
  },
  errorMessage: {
    fontSize: '12px',
    marginBottom: '10px',
    color: '#721c24',
    opacity: 0.9,
  },
  retryButton: {
    marginTop: '5px',
    padding: '4px 12px',
    fontSize: '12px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
    fontWeight: '500',
  },
};

export default CameraErrorBoundary;
