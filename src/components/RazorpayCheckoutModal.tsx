import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

export type RazorpaySuccessData = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

export type RazorpayCheckoutOptions = {
  keyId: string;
  orderId: string;
  amountInPaise: number;
  currency: string;
  planName: string;
  description?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
};

type Props = {
  visible: boolean;
  options: RazorpayCheckoutOptions | null;
  onSuccess: (data: RazorpaySuccessData) => void;
  onCancel: () => void;
  onFailure: (errorMsg: string) => void;
};

export function RazorpayCheckoutModal({
  visible,
  options,
  onSuccess,
  onCancel,
  onFailure,
}: Props) {
  const [webViewLoading, setWebViewLoading] = useState(true);

  if (!visible || !options) return null;

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>ConnectGuru Checkout</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #F9FAFB;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      color: #111827;
      text-align: center;
      padding: 24px;
    }
    .card {
      background: #ffffff;
      border-radius: 16px;
      padding: 28px 24px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.06);
      max-width: 360px;
      width: 100%;
    }
    .spinner {
      border: 3.5px solid #F3F4F6;
      border-top: 3.5px solid #E85D04;
      border-radius: 50%;
      width: 36px;
      height: 36px;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 16px auto;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .title {
      font-size: 17px;
      font-weight: 700;
      color: #1F2937;
      margin-bottom: 6px;
    }
    .subtitle {
      font-size: 13px;
      color: #6B7280;
      line-height: 1.4;
    }
  </style>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
</head>
<body>
  <div class="card">
    <div class="spinner"></div>
    <div class="title">Opening Razorpay Checkout</div>
    <div class="subtitle">Please wait while we connect to secure payment gateway...</div>
  </div>

  <script>
    (function() {
      function sendToNative(type, data) {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: type, data: data }));
        }
      }

      var checkoutOptions = {
        key: ${JSON.stringify(options.keyId)},
        amount: ${JSON.stringify(options.amountInPaise)},
        currency: ${JSON.stringify(options.currency || 'INR')},
        name: "ConnectGuru",
        description: ${JSON.stringify(options.description || `${options.planName} Plan`)},
        order_id: ${JSON.stringify(options.orderId)},
        prefill: {
          name: ${JSON.stringify(options.prefill?.name || '')},
          email: ${JSON.stringify(options.prefill?.email || '')},
          contact: ${JSON.stringify(options.prefill?.contact || '')}
        },
        theme: {
          color: "#E85D04"
        },
        handler: function(response) {
          sendToNative("PAYMENT_SUCCESS", {
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature
          });
        },
        modal: {
          ondismiss: function() {
            sendToNative("PAYMENT_CANCELLED", {});
          }
        }
      };

      try {
        var rzp = new Razorpay(checkoutOptions);
        rzp.on('payment.failed', function(response) {
          var errorReason = (response && response.error && response.error.description) 
            || 'Payment failed at gateway';
          sendToNative("PAYMENT_FAILED", { message: errorReason });
        });
        rzp.open();
      } catch (err) {
        sendToNative("PAYMENT_FAILED", { message: err.message || 'Could not launch Razorpay' });
      }
    })();
  </script>
</body>
</html>
`;

  const handleMessage = (event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'PAYMENT_SUCCESS') {
        onSuccess(msg.data);
      } else if (msg.type === 'PAYMENT_CANCELLED') {
        onCancel();
      } else if (msg.type === 'PAYMENT_FAILED') {
        onFailure(msg.data?.message || 'Payment failed during checkout.');
      }
    } catch (e) {
      console.warn('[RazorpayCheckout] JSON parse error:', e);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onCancel}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Header Bar */}
        <View style={styles.header}>
          <Pressable onPress={onCancel} style={styles.closeBtn} hitSlop={10}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Secure Checkout</Text>
            <Text style={styles.headerSub}>ConnectGuru • ⚡ Razorpay</Text>
          </View>
          <View style={{ width: 32 }} />
        </View>

        {/* WebView Container */}
        <View style={styles.webviewWrapper}>
          <WebView
            originWhitelist={['*']}
            source={{ html: htmlContent, baseUrl: 'https://api.connectguru.in' }}
            onMessage={handleMessage}
            onLoadStart={() => setWebViewLoading(true)}
            onLoadEnd={() => setWebViewLoading(false)}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            style={styles.webview}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.warn('[Razorpay WebView Error]', nativeEvent);
              onFailure('Failed to load payment checkout page.');
            }}
          />

          {webViewLoading && (
            <View style={styles.loaderOverlay}>
              <ActivityIndicator size="large" color="#E85D04" />
              <Text style={styles.loadingText}>Initializing Payment...</Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  headerSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
  webviewWrapper: {
    flex: 1,
    position: 'relative',
  },
  webview: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loaderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
});
