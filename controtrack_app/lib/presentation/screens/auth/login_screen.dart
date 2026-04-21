import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../config/app_config.dart';
import '../../../core/theme/app_colors.dart';
import '../../../l10n/app_localizations.dart';
import '../../blocs/auth/auth_cubit.dart';
import '../../blocs/auth/auth_state.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen>
    with SingleTickerProviderStateMixin {
  final _formKey   = GlobalKey<FormState>();
  final _emailCtrl = TextEditingController();
  final _passCtrl  = TextEditingController();
  bool _obscure = true;

  late final AnimationController _shakeCtrl = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 450),
  );

  @override
  void dispose() {
    _shakeCtrl.dispose();
    _emailCtrl.dispose();
    _passCtrl.dispose();
    super.dispose();
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) {
      HapticFeedback.mediumImpact();
      _shakeCtrl.forward(from: 0);
      return;
    }
    HapticFeedback.lightImpact();
    FocusScope.of(context).unfocus();
    context.read<AuthCubit>().signIn(
      email: _emailCtrl.text.trim(),
      password: _passCtrl.text.trim(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDarkMode;

    return Scaffold(
      backgroundColor: context.bgColor,
      body: Stack(
        children: [
          // ── Background glows ──────────────────────────────
          Positioned(
            top: -100,
            left: -80,
            child: _Glow(
              size: 320,
              color: context.primaryColor.withValues(alpha: isDark ? 0.16 : 0.10),
            ),
          ),
          Positioned(
            bottom: -80,
            right: -100,
            child: _Glow(
              size: 260,
              color: context.primaryLightColor.withValues(alpha: isDark ? 0.10 : 0.07),
            ),
          ),

          // ── Main content ──────────────────────────────────
          SafeArea(
            child: BlocConsumer<AuthCubit, AuthState>(
              listener: (context, state) {
                if (state.status == AuthStatus.error &&
                    state.errorMessage != null) {
                  _shakeCtrl.forward(from: 0);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(state.errorMessage!),
                      backgroundColor: context.errorColor,
                    ),
                  );
                }
              },
              builder: (context, state) {
                final loading = state.status == AuthStatus.loading;
                return SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      const SizedBox(height: 72),

                      // ── Logo ──────────────────────────────
                      _Logo()
                          .animate()
                          .fadeIn(duration: 500.ms)
                          .scaleXY(
                            begin: 0.6,
                            end: 1.0,
                            duration: 600.ms,
                            curve: Curves.easeOutBack,
                          ),

                      const SizedBox(height: 24),

                      // ── App name ──────────────────────────
                      Text(
                        AppConfig.appName,
                        style: TextStyle(
                          color: context.textPrimaryColor,
                          fontSize: 28,
                          fontWeight: FontWeight.w800,
                          letterSpacing: -0.5,
                        ),
                      )
                          .animate()
                          .fadeIn(delay: 150.ms, duration: 400.ms)
                          .slideY(begin: 0.3, end: 0, delay: 150.ms, duration: 400.ms),

                      const SizedBox(height: 6),

                      Text(
                        context.tr('app_subtitle'),
                        style: TextStyle(
                          color: context.textMutedColor,
                          fontSize: 14,
                        ),
                      ).animate().fadeIn(delay: 200.ms, duration: 400.ms),

                      const SizedBox(height: 48),

                      // ── Form card ─────────────────────────
                      _ShakeWidget(
                        controller: _shakeCtrl,
                        child: _FormCard(
                          formKey: _formKey,
                          emailCtrl: _emailCtrl,
                          passCtrl: _passCtrl,
                          obscure: _obscure,
                          loading: loading,
                          onToggleObscure: () =>
                              setState(() => _obscure = !_obscure),
                          onSubmit: _submit,
                        ),
                      )
                          .animate()
                          .fadeIn(delay: 300.ms, duration: 450.ms)
                          .slideY(begin: 0.15, end: 0, delay: 300.ms, duration: 450.ms),

                      const SizedBox(height: 32),

                      Text(
                        'v${AppConfig.appVersion}',
                        style: TextStyle(
                          color: context.textMutedColor,
                          fontSize: 12,
                        ),
                      ).animate().fadeIn(delay: 600.ms, duration: 400.ms),

                      const SizedBox(height: 24),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

// ── Logo ──────────────────────────────────────────────────────
class _Logo extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      width: 84,
      height: 84,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [context.primaryColor, context.primaryLightColor],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: context.primaryColor.withValues(alpha: 0.50),
            blurRadius: 28,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: const Icon(Icons.directions_car_rounded, color: Colors.white, size: 42),
    );
  }
}

// ── Form card ────────────────────────────────────────────────
class _FormCard extends StatelessWidget {
  final GlobalKey<FormState> formKey;
  final TextEditingController emailCtrl;
  final TextEditingController passCtrl;
  final bool obscure;
  final bool loading;
  final VoidCallback onToggleObscure;
  final VoidCallback onSubmit;

  const _FormCard({
    required this.formKey,
    required this.emailCtrl,
    required this.passCtrl,
    required this.obscure,
    required this.loading,
    required this.onToggleObscure,
    required this.onSubmit,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDarkMode;
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: context.cardColor,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: context.dividerColor),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.30 : 0.06),
            blurRadius: 28,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Form(
        key: formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              context.tr('welcome'),
              style: TextStyle(
                color: context.textPrimaryColor,
                fontSize: 22,
                fontWeight: FontWeight.w800,
                letterSpacing: -0.3,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              context.tr('sign_in_subtitle'),
              style: TextStyle(color: context.textMutedColor, fontSize: 13),
            ),
            const SizedBox(height: 24),

            // Email
            TextFormField(
              controller: emailCtrl,
              keyboardType: TextInputType.emailAddress,
              textInputAction: TextInputAction.next,
              style: TextStyle(color: context.textPrimaryColor, fontSize: 15),
              decoration: InputDecoration(
                labelText: context.tr('email'),
                prefixIcon: Icon(
                  Icons.alternate_email_rounded,
                  color: context.textMutedColor,
                  size: 20,
                ),
              ),
              validator: (v) {
                if (v == null || v.trim().isEmpty) {
                  return '${context.tr('email')} *';
                }
                final ok = RegExp(r'^[\w\.\-]+@([\w\-]+\.)+[\w\-]{2,}$')
                    .hasMatch(v.trim());
                if (!ok) return context.tr('invalid_email');
                return null;
              },
            ),

            const SizedBox(height: 14),

            // Password
            TextFormField(
              controller: passCtrl,
              obscureText: obscure,
              textInputAction: TextInputAction.done,
              onFieldSubmitted: (_) => onSubmit(),
              style: TextStyle(color: context.textPrimaryColor, fontSize: 15),
              decoration: InputDecoration(
                labelText: context.tr('password'),
                prefixIcon: Icon(
                  Icons.lock_outline_rounded,
                  color: context.textMutedColor,
                  size: 20,
                ),
                suffixIcon: IconButton(
                  icon: Icon(
                    obscure
                        ? Icons.visibility_outlined
                        : Icons.visibility_off_outlined,
                    color: context.textMutedColor,
                    size: 20,
                  ),
                  onPressed: onToggleObscure,
                ),
              ),
              validator: (v) {
                if (v == null || v.isEmpty) return '${context.tr('password')} *';
                if (v.trim().length < 8) return context.tr('password_too_short');
                return null;
              },
            ),

            const SizedBox(height: 24),

            // Submit
            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton(
                onPressed: loading ? null : onSubmit,
                child: loading
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(
                          color: Colors.white,
                          strokeWidth: 2.5,
                        ),
                      )
                    : Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            context.tr('sign_in'),
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(width: 8),
                          const Icon(Icons.arrow_forward_rounded, size: 18),
                        ],
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Background glow ───────────────────────────────────────────
class _Glow extends StatelessWidget {
  final double size;
  final Color color;
  const _Glow({required this.size, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: RadialGradient(
          colors: [color, color.withValues(alpha: 0)],
        ),
      ),
    );
  }
}

// ── Shake animation ───────────────────────────────────────────
class _ShakeWidget extends StatelessWidget {
  final AnimationController controller;
  final Widget child;

  const _ShakeWidget({required this.controller, required this.child});

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: controller,
      child: child,
      builder: (_, child) {
        final t = controller.value;
        final offset = math.sin(t * math.pi * 2 * 4) * 8 * (1 - t);
        return Transform.translate(offset: Offset(offset, 0), child: child);
      },
    );
  }
}
