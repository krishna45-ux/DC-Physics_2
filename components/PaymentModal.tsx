
import React, { useState, useEffect } from 'react';
import { X, CreditCard, Lock, CheckCircle, Smartphone, QrCode, ArrowRight, CheckCircle2, WifiOff } from 'lucide-react';
import { payment } from '../services/api';
import { purchaseCourse, getCurrentUser } from '../services/dataService'; // Import for offline fallback

declare global {
    interface Window {
        Razorpay: any;
    }
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  amount: number;
  itemName: string;
  // Passing purchase context to the modal to forward to API
  purchaseContext?: { type: 'COURSE' | 'CHAPTER', id: string };
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, onConfirm, amount, itemName, purchaseContext }) => {
  const [step, setStep] = useState<'DETAILS' | 'PROCESSING' | 'SUCCESS'>('DETAILS');
  const [errorMessage, setErrorMessage] = useState('');
  const [isOfflineFlow, setIsOfflineFlow] = useState(false);

  useEffect(() => {
    if (isOpen) {
        setStep('DETAILS');
        setErrorMessage('');
        setIsOfflineFlow(false);
    }
  }, [isOpen]);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!purchaseContext) {
        setErrorMessage("Invalid purchase details.");
        return;
    }

    setStep('PROCESSING');
    setErrorMessage('');

    try {
        // 1. Attempt to Create Order on Backend
        const orderData = await payment.createOrder(amount, purchaseContext.id, purchaseContext.type);

        if (!orderData || !orderData.id) {
            throw new Error("Invalid order data received");
        }

        // 2. Open Razorpay Options
        const options = {
            key: 'rzp_test_temporary_key_123', // Public Test Key
            amount: orderData.amount,
            currency: orderData.currency,
            name: "D C Physics",
            description: `Purchase: ${itemName}`,
            image: "https://via.placeholder.com/150",
            order_id: orderData.id,
            handler: async function (response: any) {
                // 3. Payment Successful -> Verify on Backend
                try {
                    const verification = await payment.verifyPayment({
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_signature: response.razorpay_signature,
                        itemId: purchaseContext.id,
                        type: purchaseContext.type
                    });

                    if (verification.success) {
                        setStep('SUCCESS');
                        onConfirm();
                    } else {
                        setStep('DETAILS');
                        setErrorMessage("Payment verification failed.");
                    }
                } catch (verifyErr) {
                    console.error(verifyErr);
                    setStep('DETAILS');
                    setErrorMessage("Verification error. Please contact support.");
                }
            },
            prefill: {
                name: "Student Name",
                email: "student@example.com",
                contact: "9999999999"
            },
            theme: {
                color: "#4f46e5"
            },
            modal: {
                ondismiss: function() {
                    setStep('DETAILS');
                }
            }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();

    } catch (err: any) {
        console.warn("Payment API failed", err);

        // --- OFFLINE FALLBACK ---
        // If Network Error (backend down) or Server Error, simulate payment for demo purposes
        if (err.code === 'ERR_NETWORK' || !err.response || err.response.status >= 500) {
            console.log("Switching to Offline Payment Simulation");
            setIsOfflineFlow(true);

            // Simulate processing delay
            setTimeout(() => {
                // Manually update local storage database
                const currentUser = getCurrentUser();
                if (currentUser) {
                    purchaseCourse(currentUser.id, purchaseContext.type, purchaseContext.id);
                }

                setStep('SUCCESS');
                // Don't call onConfirm immediately here, let user click "Go to Dashboard"
            }, 2000);
        } else {
            setStep('DETAILS');
            setErrorMessage(err.response?.data?.message || err.message || "Failed to initiate payment.");
        }
    }
  };

  const handleSuccessDismiss = () => {
      onConfirm(); // Trigger app refresh
      onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">

        <div className="fixed inset-0 bg-slate-900 bg-opacity-75 transition-opacity duration-300" aria-hidden="true" onClick={onClose}></div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md w-full">

          {step === 'DETAILS' && (
             <form onSubmit={handlePay}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <div className="flex justify-between items-start mb-5">
                        <h3 className="text-lg leading-6 font-bold text-slate-900" id="modal-title">
                            Secure Payment
                        </h3>
                        <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-500 transition-colors">
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    <div className="bg-indigo-50 p-4 rounded-xl mb-6 flex justify-between items-center border border-indigo-100">
                        <div>
                            <p className="text-xs text-indigo-600 font-bold uppercase tracking-wide">Total Amount</p>
                            <p className="text-2xl font-bold text-indigo-900">₹{amount}</p>
                        </div>
                        <div className="text-right max-w-[50%]">
                             <p className="text-xs text-indigo-600 font-medium truncate">{itemName}</p>
                        </div>
                    </div>

                    {errorMessage && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
                            {errorMessage}
                        </div>
                    )}

                    <p className="text-sm text-slate-600 mb-4">
                        Clicking "Pay Now" will open the secure Razorpay payment gateway.
                    </p>

                    <div className="flex items-center justify-center p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <img src="https://razorpay.com/assets/razorpay-glyph.svg" alt="Razorpay" className="h-8 mr-2" />
                        <span className="text-sm font-semibold text-slate-700">Trusted Payment Gateway</span>
                    </div>
                </div>
                <div className="bg-slate-50 px-4 py-4 sm:px-6 sm:flex sm:flex-row-reverse border-t border-slate-100">
                    <button type="submit" className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-lg shadow-indigo-200 px-4 py-3 bg-indigo-600 text-base font-bold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm transition-all transform active:scale-95">
                        Pay ₹{amount} with Razorpay
                    </button>
                    <button type="button" onClick={onClose} className="mt-3 w-full inline-flex justify-center rounded-lg border border-slate-300 shadow-sm px-4 py-3 bg-white text-base font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-colors">
                        Cancel
                    </button>
                </div>
             </form>
          )}

          {step === 'PROCESSING' && (
              <div className="p-12 text-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-100 border-b-indigo-600 mx-auto mb-6"></div>
                  <h3 className="text-lg font-bold text-slate-900">
                      {isOfflineFlow ? 'Processing Offline Transaction...' : 'Waiting for Payment...'}
                  </h3>
                  <p className="text-slate-500 text-sm mt-2">
                      {isOfflineFlow ? 'Please wait while we confirm your purchase.' : 'Please complete the transaction in the popup window.'}
                  </p>
                  {!isOfflineFlow && (
                      <button onClick={() => setStep('DETAILS')} className="mt-6 text-sm text-indigo-600 hover:underline">Cancel and go back</button>
                  )}
              </div>
          )}

          {step === 'SUCCESS' && (
              <div className="p-8 text-center bg-white animate-fade-in-up">
                  <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100 mb-6 animate-bounce">
                      <CheckCircle className="h-10 w-10 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Payment Successful!</h3>
                  <p className="text-slate-500 mb-8">Access has been granted to your account.</p>

                  {isOfflineFlow && (
                      <div className="mb-6 bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-start text-left">
                          <WifiOff className="h-5 w-5 text-amber-600 mr-2 flex-shrink-0" />
                          <p className="text-xs text-amber-800">
                              <strong>Note:</strong> Transaction completed in offline demo mode. Backend verification was skipped due to network connectivity.
                          </p>
                      </div>
                  )}

                  <button
                    onClick={handleSuccessDismiss}
                    className="w-full inline-flex items-center justify-center rounded-xl border border-transparent shadow-lg shadow-indigo-200 px-6 py-4 bg-indigo-600 text-base font-bold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition transform hover:-translate-y-1"
                  >
                      Go to Dashboard <ArrowRight className="ml-2 h-5 w-5" />
                  </button>
              </div>
          )}

        </div>
      </div>
    </div>
  );
};
