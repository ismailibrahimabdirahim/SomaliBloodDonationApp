import React, { createContext, useContext, useState, ReactNode } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { CircleCheck, TriangleAlert, Info, X } from 'lucide-react-native';
import { useTheme, palette } from '../theme/colors';

type AlertType = 'success' | 'error' | 'info';

type AlertOptions = {
  title: string;
  message: string;
  type?: AlertType;
  onConfirm?: () => void;
  confirmText?: string;
  onCancel?: () => void;
  cancelText?: string;
};

type AlertContextType = {
  showAlert: (options: AlertOptions) => void;
};

const AlertContext = createContext<AlertContextType | null>(null);

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) throw new Error('useAlert must be used within an AlertProvider');
  return context;
};

export const AlertProvider = ({ children }: { children: ReactNode }) => {
  const { colors, isDark } = useTheme();
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState<AlertOptions | null>(null);

  const showAlert = (options: AlertOptions) => {
    setConfig({ type: 'info', confirmText: 'OK', ...options });
    setVisible(true);
  };

  const closeAlert = () => {
    setVisible(false);
    setTimeout(() => setConfig(null), 300); // Wait for fade out
  };

  const handleConfirm = () => {
    if (config?.onConfirm) config.onConfirm();
    closeAlert();
  };

  const handleCancel = () => {
    if (config?.onCancel) config.onCancel();
    closeAlert();
  };

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
        <View style={styles.overlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <TouchableOpacity style={styles.closeBtn} onPress={handleCancel}>
              <X size={20} color={colors.textMuted} />
            </TouchableOpacity>

            <View
              style={[
                styles.iconBox,
                {
                  backgroundColor:
                    config?.type === 'error'
                      ? isDark ? 'rgba(239,68,68,0.12)' : palette.red50
                      : config?.type === 'success'
                      ? isDark ? 'rgba(34,197,94,0.12)' : palette.green50
                      : isDark ? 'rgba(59,130,246,0.12)' : palette.blue50,
                },
              ]}
            >
              {config?.type === 'error' && <TriangleAlert size={32} color={palette.red500} />}
              {config?.type === 'success' && <CircleCheck size={32} color={palette.green500} />}
              {(!config?.type || config?.type === 'info') && <Info size={32} color={palette.blue600} />}
            </View>

            <Text style={[styles.title, { color: colors.text }]}>{config?.title}</Text>
            <Text style={[styles.message, { color: colors.textMuted }]}>{config?.message}</Text>

            <View style={styles.actionRow}>
              {config?.onCancel && (
                <TouchableOpacity
                  style={[styles.cancelBtn, { backgroundColor: colors.inputBg }]}
                  onPress={handleCancel}
                >
                  <Text style={[styles.cancelBtnText, { color: colors.text }]}>
                    {config.cancelText || 'Cancel'}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[
                  styles.confirmBtn,
                  {
                    backgroundColor:
                      config?.type === 'error'
                        ? palette.red500
                        : config?.type === 'success'
                        ? palette.green500
                        : palette.blue600,
                    marginLeft: config?.onCancel ? 12 : 0,
                  },
                ]}
                onPress={handleConfirm}
              >
                <Text style={styles.confirmBtnText}>{config?.confirmText || 'OK'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </AlertContext.Provider>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  actionRow: {
    flexDirection: 'row',
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontWeight: '800',
    fontSize: 15,
  },
  confirmBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
});
