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
    with TickerProviderStateMixin {
  final _formKey = GlobalKey<FormState>();
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  bool _obscure = true;

  // Controls the shake animation on the form card when an error occurs.
  late final AnimationController _shakeCtrl;

  // Drives the slowly shifting gradient background.
  late final AnimationController _bgCtrl;

  @override
  void initState() {
    super.initState();
    _shakeCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
    );
    _bgCtrl = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 12),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _shakeCtrl.dispose();
    _bgCtrl.dispose();
    _emailCtrl.dispose();
    _passCtrl.dispose();
    super.dispose();
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) {
      _triggerShake();
      return;
    }
    HapticFeedback.lightImpact();
    FocusScope.of(context).unfocus();
    context.read<AuthCubit>().signIn(
          email: _emailCtrl.text.trim(),
          password: _passCtrl.text.trim(),
        );
  }

  void _triggerShake() {
    HapticFeedback.mediumImpact();
    _shakeCtrl.forward(from: 0);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          // Animated radial gradient background.
          AnimatedBuilder(
            animation: _bgCtrl,
            builder: (context, _) {
              final t = Curves.easeInOut.transform(_bgCtrl.value);
              final center = Alignment(
                -0.6 + 1.2 * t,
                -0.8 + 0.6 * t,
              );
              final radius = 1.0 + 0.4 * t;
              return Container(
                decoration: BoxDecoration(
                  gradient: RadialGradient(
                    center: center,
                    radius: radius,
                    colors: [
                      Color.lerp(
                            AppColors.primary.withValues(alpha: 0.28),
                            AppColors.accent.withValues(alpha: 0.28),
                            t,
                          ) ??
                          AppColors.primary,
                      Color.lerp(
                            AppColors.secondary.withValues(alpha: 0.18),
                            AppColors.primary.withValues(alpha: 0.18),
                            t,
                          ) ??
                          AppColors.secondary,
                      context.bgColor,
                    ],
                    stops: const [0.0, 0.35, 1.0],
                  ),
                ),
              );
            },
          ),
          // A subtle secondary animated glow using TweenAnimationBuilder.
          TweenAnimationBuilder<double>(
            tween: Tween(begin: 0, end: 1),
            duration: const Duration(seconds: 8),
            curve: Curves.easeInOut,
            builder: (context, value, _) {
              return Positioned(
                bottom: -120 + (40 * value),
                right: -80 + (60 * value),
                child: Container(
                  width: 320,
                  height: 320,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: RadialGradient(
                      colors: [
                        AppColors.accent.withValues(alpha: 0.22),
                        AppColors.accent.withValues(alpha: 0.0),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
          SafeArea(
            child: BlocConsumer<AuthCubit, AuthState>(
              listener: (context, state) {
                if (state.status == AuthStatus.error &&
                    state.errorMessage != null) {
                  _triggerShake();
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(state.errorMessage!),
                      backgroundColor: AppColors.error,
                    ),
                  );
                }
              },
              builder: (context, state) {
                final loading = state.status == AuthStatus.loading;
                return SingleChildScrollView(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 28, vertical: 24),
                  child: Column(
                    children: [
                      const SizedBox(height: 40),
                      // Logo with entrance + repeating pulse glow.
                      _PulsingLogo()
                          .animate()
                          .fadeIn(
                              duration: 600.ms,
                              delay: 300.ms,
                              curve: Curves.easeOut)
                          .scale(
                            begin: const Offset(0.5, 0.5),
                            end: const Offset(1, 1),
                            duration: 700.ms,
                            delay: 300.ms,
                            curve: Curves.elasticOut,
                          ),
                      const SizedBox(height: 24),
                      // App name.
                      Text(
                        AppConfig.appName,
                        style: TextStyle(
                          color: context.textPrimaryColor,
                          fontSize: 32,
                          fontWeight: FontWeight.w800,
                          letterSpacing: -0.5,
                        ),
                      )
                          .animate()
                          .fadeIn(duration: 500.ms, delay: 400.ms)
                          .slideY(
                            begin: 0.4,
                            end: 0,
                            duration: 500.ms,
                            delay: 400.ms,
                            curve: Curves.easeOutCubic,
                          ),
                      const SizedBox(height: 6),
                      // Subtitle.
                      Text(
                        context.tr('app_subtitle'),
                        style: TextStyle(
                            color: context.textSecondaryColor, fontSize: 14),
                      )
                          .animate()
                          .fadeIn(duration: 500.ms, delay: 500.ms),
                      const SizedBox(height: 48),
                      // Form card — wrapped in a shake widget that triggers on error.
                      _ShakeWidget(
                        controller: _shakeCtrl,
                        child: _buildFormCard(context, loading),
                      )
                          .animate()
                          .fadeIn(duration: 500.ms, delay: 600.ms)
                          .slideY(
                            begin: 0.3,
                            end: 0,
                            duration: 550.ms,
                            delay: 600.ms,
                            curve: Curves.easeOutCubic,
                          ),
                      const SizedBox(height: 28),
                      Text(
                        'v${AppConfig.appVersion}',
                        style: TextStyle(
                            color: context.textMutedColor, fontSize: 11),
                      )
                          .animate()
                          .fadeIn(duration: 400.ms, delay: 900.ms),
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

  Widget _buildFormCard(BuildContext context, bool loading) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: context.cardGradientColor,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: context.dividerColor),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.3),
            blurRadius: 24,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(context.tr('welcome'),
                style: Theme.of(context).textTheme.headlineMedium),
            const SizedBox(height: 6),
            Text(
              'Sign in to continue to your fleet',
              style: TextStyle(color: context.textSecondaryColor, fontSize: 13),
            ),
            const SizedBox(height: 24),
            TextFormField(
              controller: _emailCtrl,
              keyboardType: TextInputType.emailAddress,
              textInputAction: TextInputAction.next,
              decoration: InputDecoration(
                labelText: context.tr('email'),
                prefixIcon: Icon(Icons.alternate_email,
                    color: context.textMutedColor),
              ),
              validator: (v) {
                if (v == null || v.trim().isEmpty) {
                  return '${context.tr('email')} *';
                }
                final emailRegex =
                    RegExp(r'^[\w\.\-]+@([\w\-]+\.)+[\w\-]{2,}$');
                if (!emailRegex.hasMatch(v.trim())) {
                  return context.tr('invalid_email');
                }
                return null;
              },
            ),
            const SizedBox(height: 14),
            TextFormField(
              controller: _passCtrl,
              obscureText: _obscure,
              textInputAction: TextInputAction.done,
              onFieldSubmitted: (_) => _submit(),
              decoration: InputDecoration(
                labelText: context.tr('password'),
                prefixIcon:
                    Icon(Icons.lock_outline, color: context.textMutedColor),
                suffixIcon: IconButton(
                  icon: Icon(
                    _obscure
                        ? Icons.visibility_outlined
                        : Icons.visibility_off_outlined,
                    color: context.textMutedColor,
                  ),
                  onPressed: () => setState(() => _obscure = !_obscure),
                ),
              ),
              validator: (v) {
                if (v == null || v.isEmpty) {
                  return '${context.tr('password')} *';
                }
                if (v.trim().length < 8) {
                  return context.tr('password_too_short');
                }
                return null;
              },
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 54,
              child: ElevatedButton(
                onPressed: loading ? null : _submit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
                child: loading
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(
                            color: Colors.black, strokeWidth: 2.5),
                      )
                    : Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            context.tr('sign_in'),
                            style: const TextStyle(
                              color: Colors.black,
                              fontSize: 16,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          const SizedBox(width: 8),
                          const Icon(Icons.arrow_forward_rounded,
                              color: Colors.black),
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

/// The logo tile with a subtle, repeating pulsing glow.
class _PulsingLogo extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final logo = Container(
      width: 96,
      height: 96,
      decoration: BoxDecoration(
        gradient: AppColors.primaryGradient,
        borderRadius: BorderRadius.circular(28),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.4),
            blurRadius: 30,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: const Icon(Icons.location_on_rounded,
          color: Colors.black, size: 52),
    );

    // Continuous pulsing shimmer / glow.
    return logo
        .animate(onPlay: (c) => c.repeat(reverse: true))
        .shimmer(
          duration: 2200.ms,
          color: AppColors.primary.withValues(alpha: 0.35),
        )
        .scaleXY(
          begin: 1.0,
          end: 1.04,
          duration: 1800.ms,
          curve: Curves.easeInOut,
        );
  }
}

/// Applies a horizontal shake when its [controller] is driven from 0 → 1.
class _ShakeWidget extends StatelessWidget {
  final AnimationController controller;
  final Widget child;

  // Constants chosen to feel like a quick, snappy error shake.
  static const double _amount = 8;
  static const int _hz = 4;

  const _ShakeWidget({
    required this.controller,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: controller,
      builder: (context, _) {
        // Decay the shake so it settles at rest.
        final t = controller.value;
        final decay = 1 - t;
        final offset = math.sin(t * math.pi * 2 * _hz) * _amount * decay;
        return Transform.translate(
          offset: Offset(offset, 0),
          child: child,
        );
      },
      child: child,
    );
  }
}
