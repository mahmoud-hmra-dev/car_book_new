import { useState } from 'react'
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'
import { Text, TextInput, Button, HelperText } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '@/context/AuthContext'
import { colors, spacing, typography } from '@/theme'
import i18n from '@/lang/i18n'

const SignInScreen = () => {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter email and password')
      return
    }
    setLoading(true)
    setError('')
    const result = await signIn(email.trim(), password)
    setLoading(false)
    if (!result.success) {
      setError(result.error || i18n.t('SIGN_IN_ERROR'))
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Logo Area */}
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoIcon}>{'🛰️'}</Text>
            </View>
            <Text style={styles.appName}>Fleet Tracker</Text>
            <Text style={styles.subtitle}>Fleet Management & GPS Tracking</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <TextInput
              label={i18n.t('EMAIL')}
              value={email}
              onChangeText={(text) => { setEmail(text); setError('') }}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              left={<TextInput.Icon icon="email-outline" />}
              style={styles.input}
              theme={{ colors: { primary: colors.primary, onSurfaceVariant: colors.textSecondary } }}
              textColor={colors.textPrimary}
              outlineColor={colors.border}
              activeOutlineColor={colors.primary}
            />

            <TextInput
              label={i18n.t('PASSWORD')}
              value={password}
              onChangeText={(text) => { setPassword(text); setError('') }}
              mode="outlined"
              secureTextEntry={!showPassword}
              left={<TextInput.Icon icon="lock-outline" />}
              right={
                <TextInput.Icon
                  icon={showPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowPassword(!showPassword)}
                />
              }
              style={styles.input}
              theme={{ colors: { primary: colors.primary, onSurfaceVariant: colors.textSecondary } }}
              textColor={colors.textPrimary}
              outlineColor={colors.border}
              activeOutlineColor={colors.primary}
            />

            {error ? (
              <HelperText type="error" visible style={styles.error}>
                {error}
              </HelperText>
            ) : null}

            <Button
              mode="contained"
              onPress={handleSignIn}
              loading={loading}
              disabled={loading}
              style={styles.button}
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonLabel}
              buttonColor={colors.primary}
              textColor={colors.textInverse}
            >
              {loading ? i18n.t('SIGNING_IN') : i18n.t('SIGN_IN')}
            </Button>
          </View>

          {/* Footer */}
          <Text style={styles.footer}>Powered by BookCars Fleet Management</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.xxxxl,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logoIcon: {
    fontSize: 36,
  },
  appName: {
    fontSize: typography.sizes.display,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.sizes.subtitle,
    color: colors.textSecondary,
  },
  form: {
    gap: spacing.lg,
  },
  input: {
    backgroundColor: colors.surface,
  },
  error: {
    color: colors.danger,
    marginTop: -spacing.sm,
  },
  button: {
    borderRadius: 12,
    marginTop: spacing.sm,
  },
  buttonContent: {
    height: 52,
  },
  buttonLabel: {
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.semibold,
  },
  footer: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    marginTop: spacing.xxxxl,
  },
})

export default SignInScreen
