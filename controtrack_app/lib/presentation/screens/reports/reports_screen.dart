import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_colors.dart';
import '../../../data/models/fleet_item_model.dart';
import '../../../data/models/report_model.dart';
import '../../../data/repositories/tracking_repository.dart';
import '../../../l10n/app_localizations.dart';
import '../../blocs/fleet/fleet_cubit.dart';
import '../../widgets/common/app_error.dart';
import '../../widgets/common/app_loading.dart';

class ReportsScreen extends StatefulWidget {
  const ReportsScreen({super.key});

  @override
  State<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends State<ReportsScreen> {
  FleetItem? _selected;
  DateTime _from = DateTime.now().subtract(const Duration(days: 7));
  DateTime _to = DateTime.now();
  ReportModel? _report;
  bool _loading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final items = context.read<FleetCubit>().state.items;
    if (items.isNotEmpty) _selected = items.first;
  }

  Future<void> _pickDate(bool isFrom) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: isFrom ? _from : _to,
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now(),
      builder: (ctx, child) => Theme(
        data: Theme.of(ctx).copyWith(
          colorScheme: ColorScheme.fromSeed(
            brightness: ctx.isDarkMode ? Brightness.dark : Brightness.light,
            seedColor: AppColors.primary,
            primary: AppColors.primary,
            surface: ctx.surfaceColor,
            onPrimary: Colors.black,
          ),
        ),
        child: child!,
      ),
    );
    if (picked == null) return;
    setState(() {
      if (isFrom) {
        _from = picked;
      } else {
        _to = picked;
      }
    });
  }

  Future<void> _fetch() async {
    if (_selected == null) return;
    final repo = context.read<TrackingRepository>();
    setState(() {
      _loading = true;
      _error = null;
      _report = null;
    });
    try {
      final r = await repo.getReport(_selected!.carId, _from, _to);
      if (!mounted) return;
      setState(() {
        _report = r;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  String _fmtDuration(int seconds) {
    final d = Duration(seconds: seconds);
    final h = d.inHours;
    final m = d.inMinutes.remainder(60);
    if (h > 0) return '${h}h ${m}m';
    return '${m}m';
  }

  Future<void> _openFleetSummarySheet() async {
    final items = context.read<FleetCubit>().state.items;
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: context.surfaceColor,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        final total = items.length;
        final moving =
            items.where((e) => e.movementStatus == 'moving').length;
        final stopped =
            items.where((e) => e.movementStatus == 'stopped').length;
        final idle = items.where((e) => e.movementStatus == 'idle').length;
        final offline =
            items.where((e) => e.movementStatus == 'offline').length;
        return Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 44,
                  height: 4,
                  decoration: BoxDecoration(
                    color: ctx.textMutedColor,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 18),
              Text(ctx.tr('fleet_overview'),
                  style: Theme.of(ctx).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w800,
                      )),
              const SizedBox(height: 14),
              _SummaryRow(
                  label: ctx.tr('total'),
                  value: '$total',
                  color: AppColors.primary),
              _SummaryRow(
                  label: ctx.tr('moving'),
                  value: '$moving',
                  color: AppColors.statusMoving),
              _SummaryRow(
                  label: ctx.tr('idle'),
                  value: '$idle',
                  color: AppColors.statusIdle),
              _SummaryRow(
                  label: ctx.tr('stopped'),
                  value: '$stopped',
                  color: AppColors.statusStopped),
              _SummaryRow(
                  label: ctx.tr('offline'),
                  value: '$offline',
                  color: AppColors.statusOffline),
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => Navigator.pop(ctx),
                  child: Text(ctx.tr('close')),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  void _openRouteReport() {
    // Scroll to, or expose, the per-vehicle route report form below.
    setState(() => _showRouteReport = !_showRouteReport);
  }

  bool _showRouteReport = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: context.bgColor,
      appBar: AppBar(
        backgroundColor: context.bgColor,
        elevation: 0,
        title: Text(context.tr('reports')),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.pop(),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
        children: [
          Text(
            context.tr('reports'),
            style: TextStyle(
              color: context.textPrimaryColor,
              fontSize: 22,
              fontWeight: FontWeight.w800,
              letterSpacing: -0.3,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Analytics, performance and violations',
            style: TextStyle(color: context.textMutedColor, fontSize: 13),
          ),
          const SizedBox(height: 20),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 1.05,
            children: [
              _ReportCard(
                icon: Icons.speed_rounded,
                color: AppColors.error,
                title: context.tr('speed_violations'),
                subtitle: 'Overspeed incidents',
                onTap: () => context.push('/reports/speed-violations'),
              ).animate().fadeIn(delay: 50.ms, duration: 350.ms).slideY(
                    begin: 0.1,
                    end: 0,
                  ),
              _ReportCard(
                icon: Icons.route_rounded,
                color: AppColors.primary,
                title: 'Route Reports',
                subtitle: 'Distance & duration',
                onTap: _openRouteReport,
              ).animate().fadeIn(delay: 100.ms, duration: 350.ms).slideY(
                    begin: 0.1,
                    end: 0,
                  ),
              _ReportCard(
                icon: Icons.assignment_rounded,
                color: AppColors.secondary,
                title: 'Fleet Summary',
                subtitle: 'Daily / weekly report',
                onTap: () => context.push('/reports/summary'),
              ).animate().fadeIn(delay: 200.ms, duration: 350.ms).slideY(
                    begin: 0.1,
                    end: 0,
                  ),
              _ReportCard(
                icon: Icons.pie_chart_rounded,
                color: AppColors.accent,
                title: 'Quick Summary',
                subtitle: 'Status overview',
                onTap: _openFleetSummarySheet,
              ).animate().fadeIn(delay: 400.ms, duration: 350.ms).slideY(
                    begin: 0.1,
                    end: 0,
                  ),
            ],
          ),
          if (_showRouteReport) ...[
            const SizedBox(height: 24),
            _buildRouteReportForm(context)
                .animate()
                .fadeIn(duration: 300.ms)
                .slideY(begin: 0.05, end: 0),
          ],
        ],
      ),
    );
  }

  Widget _buildRouteReportForm(BuildContext context) {
    final items = context.watch<FleetCubit>().state.items;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: context.cardGradientColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: context.dividerColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.route_rounded,
                    color: AppColors.primary, size: 18),
              ),
              const SizedBox(width: 10),
              Text(
                'Route Report',
                style: TextStyle(
                  color: context.textPrimaryColor,
                  fontSize: 15,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          DropdownButtonFormField<String>(
            value: _selected?.carId,
            style: TextStyle(color: context.textPrimaryColor, fontSize: 15),
            decoration: InputDecoration(
              labelText: context.tr('vehicle'),
              prefixIcon: const Icon(Icons.directions_car_rounded),
            ),
            dropdownColor: context.cardColor,
            items: items
                .map((e) => DropdownMenuItem(
                      value: e.carId,
                      child: Text('${e.carName} • ${e.licensePlate}'),
                    ))
                .toList(),
            onChanged: (v) {
              if (v == null) return;
              setState(() {
                _selected = items.firstWhere((e) => e.carId == v);
              });
            },
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _dateCard(
                    context.tr('from'), _from, () => _pickDate(true)),
              ),
              const SizedBox(width: 10),
              Expanded(
                child:
                    _dateCard(context.tr('to'), _to, () => _pickDate(false)),
              ),
            ],
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: _loading ? null : _fetch,
              icon: const Icon(Icons.summarize_rounded),
              label: Text(_loading
                  ? context.tr('loading')
                  : context.tr('generate_report')),
            ),
          ),
          const SizedBox(height: 16),
          if (_loading) const AppLoading(),
          if (_error != null) AppError(message: _error!, onRetry: _fetch),
          if (_report != null) ...[
            Row(
              children: [
                Expanded(
                  child: _SummaryTile(
                    icon: Icons.route_rounded,
                    color: AppColors.primary,
                    label: context.tr('distance'),
                    value: '${_report!.distance.toStringAsFixed(1)} km',
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _SummaryTile(
                    icon: Icons.access_time_rounded,
                    color: AppColors.secondary,
                    label: context.tr('duration'),
                    value: _fmtDuration(_report!.duration),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: _SummaryTile(
                    icon: Icons.speed_rounded,
                    color: AppColors.statusStopped,
                    label: context.tr('max_speed'),
                    value: '${_report!.maxSpeed.toStringAsFixed(0)} km/h',
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _SummaryTile(
                    icon: Icons.show_chart_rounded,
                    color: AppColors.warning,
                    label: context.tr('avg_speed'),
                    value: '${_report!.avgSpeed.toStringAsFixed(0)} km/h',
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            _SummaryTile(
              icon: Icons.pin_drop_rounded,
              color: AppColors.accent,
              label: context.tr('stops'),
              value: '${_report!.stops}',
              fullWidth: true,
            ),
          ],
        ],
      ),
    );
  }

  Widget _dateCard(String label, DateTime d, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: context.cardColor,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: context.dividerColor),
        ),
        child: Row(
          children: [
            const Icon(Icons.calendar_today_rounded,
                color: AppColors.primary, size: 16),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label,
                      style: TextStyle(
                          color: context.textMutedColor, fontSize: 10)),
                  const SizedBox(height: 2),
                  Text(DateFormat('MMM d, yyyy').format(d),
                      style: TextStyle(
                          color: context.textPrimaryColor,
                          fontWeight: FontWeight.w700,
                          fontSize: 13)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ReportCard extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String title;
  final String subtitle;
  final VoidCallback onTap;
  const _ReportCard({
    required this.icon,
    required this.color,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: context.cardGradientColor,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: context.dividerColor),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: color.withValues(alpha: 0.35),
                  ),
                ),
                child: Icon(icon, color: color, size: 24),
              ),
              const Spacer(),
              Text(
                title,
                style: TextStyle(
                  color: context.textPrimaryColor,
                  fontSize: 15,
                  fontWeight: FontWeight.w800,
                  letterSpacing: -0.2,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 4),
              Row(
                children: [
                  Expanded(
                    child: Text(
                      subtitle,
                      style: TextStyle(
                        color: context.textMutedColor,
                        fontSize: 12,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  Icon(Icons.chevron_right_rounded,
                      size: 18, color: context.textMutedColor),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SummaryTile extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String label;
  final String value;
  final bool fullWidth;
  const _SummaryTile({
    required this.icon,
    required this.color,
    required this.label,
    required this.value,
    this.fullWidth = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: fullWidth ? double.infinity : null,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: context.cardColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: context.dividerColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.18),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: color, size: 18),
          ),
          const SizedBox(height: 10),
          Text(value,
              style: TextStyle(
                color: context.textPrimaryColor,
                fontSize: 18,
                fontWeight: FontWeight.w800,
              )),
          const SizedBox(height: 2),
          Text(label,
              style:
                  TextStyle(color: context.textMutedColor, fontSize: 11)),
        ],
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  const _SummaryRow({
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Container(
            width: 10,
            height: 10,
            decoration: BoxDecoration(
              color: color,
              borderRadius: BorderRadius.circular(3),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(label,
                style: TextStyle(
                    color: context.textPrimaryColor,
                    fontWeight: FontWeight.w600)),
          ),
          Text(
            value,
            style: TextStyle(
              color: color,
              fontSize: 16,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}
