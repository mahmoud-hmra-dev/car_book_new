import React from 'react'
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native'
import i18n from '@/lang/i18n'

interface ConfirmDialogProps {
  visible: boolean
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

const ConfirmDialog = ({ visible, title, message, onConfirm, onCancel, confirmLabel, cancelLabel, danger }: ConfirmDialogProps) => (
  <Modal transparent visible={visible} animationType="fade">
    <View style={styles.overlay}>
      <View style={styles.dialog}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        <View style={styles.actions}>
          <Pressable style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelText}>{cancelLabel || i18n.t('CANCEL')}</Text>
          </Pressable>
          <Pressable
            style={[styles.confirmButton, danger && styles.dangerButton]}
            onPress={onConfirm}
          >
            <Text style={styles.confirmText}>{confirmLabel || i18n.t('CONFIRM')}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  </Modal>
)

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialog: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    color: '#666',
    marginBottom: 24,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelText: {
    color: '#666',
    fontWeight: '600',
  },
  confirmButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#6B3CE6',
  },
  dangerButton: {
    backgroundColor: '#EF4444',
  },
  confirmText: {
    color: '#fff',
    fontWeight: '600',
  },
})

export default ConfirmDialog
