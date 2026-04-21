import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../core/theme/app_colors.dart';
import '../../../data/models/driver_model.dart';
import '../../../data/models/fleet_item_model.dart';
import '../../../data/repositories/tracking_repository.dart';
import '../../../l10n/app_localizations.dart';
import '../../blocs/fleet/fleet_cubit.dart';
import '../../widgets/common/app_loading.dart';
import '../../widgets/web/web_page_scaffold.dart';

/// Lightweight snapshot of an infraction used only inside the search screen.
/// We intentionally duplicate a handful of fields here instead of importing
/// the `InfractionModel` from `infractions_screen.dart`, which is a private
/// class inside that file's library.
class _SearchInfraction {
  final String id;
  final String vehicleName;
  final String driverName;
  final String type;
  final String description;
  final String status;
  final double amount;
  final DateTime date;

  const _SearchInfraction({
    required this.id,
    required this.vehicleName,
    required this.driverName,
    required this.type,
    required this.description,
    required this.status,
    required this.amount,
    required this.date,
  });

  factory _SearchInfraction.fromJson(Map<String, dynamic> j) {
    return _SearchInfraction(
      id: (j['id'] ?? '').toString(),
      vehicleName: (j['vehicleName'] ?? '').toString(),
      driverName: (j['driverName'] ?? '').toString(),
      type: (j['type'] ?? 'other').toString(),
      description: (j['description'] ?? '').toString(),
      status: (j['status'] ?? 'pending').toString(),
      amount: (j['amount'] is num) ? (j['amount'] as num).toDouble() : 0,
      date: DateTime.tryParse(j['date']?.toString() ?? '') ?? DateTime.now(),
    );
  }

  String get _haystack =>
      '$vehicleName $driverName $type $description $status'.toLowerCase();
}

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

const _kSearchHistoryKey = 'search_history';
const _kMaxHistory = 6;

class _SearchScreenState extends State<SearchScreen> {
  final _controller = TextEditingController();
  String _query = '';

  bool _loading = true;
  List<DriverModel> _drivers = const [];
  List<_SearchInfraction> _infractions = const [];
  List<String> _recentSearches = const [];

  @override
  void initState() {
    super.initState();
    _controller.addListener(() {
      setState(() => _query = _controller.text.trim().toLowerCase());
    });
    _bootstrap();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _bootstrap() async {
    // Hoist any BuildContext reads before awaits to stay safe with
    // use_build_context_synchronously.
    final trackingRepo = context.read<TrackingRepository>();

    List<DriverModel> drivers = const [];
    try {
      drivers = await trackingRepo.getDrivers();
    } catch (_) {
      // Network or auth error — leave drivers empty rather than blocking search.
      drivers = const [];
    }

    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString('infractions_list');
    final infractions = <_SearchInfraction>[];
    if (raw != null && raw.isNotEmpty) {
      try {
        final decoded = json.decode(raw);
        if (decoded is List) {
          for (final e in decoded) {
            if (e is Map) {
              infractions.add(
                _SearchInfraction.fromJson(Map<String, dynamic>.from(e)),
              );
            }
          }
        }
      } catch (_) {
        // ignore malformed
      }
    }

    // Load search history
    final historyRaw = prefs.getStringList(_kSearchHistoryKey) ?? [];

    if (!mounted) return;
    setState(() {
      _drivers = drivers;
      _infractions = infractions;
      _recentSearches = historyRaw;
      _loading = false;
    });
  }

  Future<void> _saveSearch(String query) async {
    final trimmed = query.trim();
    if (trimmed.isEmpty || trimmed.length < 2) return;
    final history = [..._recentSearches];
    history.remove(trimmed); // remove duplicate
    history.insert(0, trimmed);
    final capped = history.take(_kMaxHistory).toList();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList(_kSearchHistoryKey, capped);
    if (!mounted) return;
    setState(() => _recentSearches = capped);
  }

  Future<void> _removeSearch(String query) async {
    final history = _recentSearches.where((h) => h != query).toList();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList(_kSearchHistoryKey, history);
    if (!mounted) return;
    setState(() => _recentSearches = history);
  }

  Future<void> _clearHistory() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_kSearchHistoryKey);
    if (!mounted) return;
    setState(() => _recentSearches = const []);
  }

  void _applySearch(String query) {
    _controller.text = query;
    _controller.selection = TextSelection.collapsed(offset: query.length);
    setState(() => _query = query.trim().toLowerCase());
  }

  List<FleetItem> _filterVehicles(List<FleetItem> items) {
    if (_query.isEmpty) return const [];
    return items.where((v) {
      final hay = [
        v.carName,
        v.licensePlate,
        v.movementStatus,
        v.address ?? '',
        v.supplierName ?? '',
      ].join(' ').toLowerCase();
      return hay.contains(_query);
    }).toList();
  }

  List<DriverModel> _filterDrivers() {
    if (_query.isEmpty) return const [];
    return _drivers.where((d) {
      final hay = [
        d.name,
        d.phone ?? '',
        d.email ?? '',
        d.licenseNumber ?? '',
      ].join(' ').toLowerCase();
      return hay.contains(_query);
    }).toList();
  }

  List<_SearchInfraction> _filterInfractions() {
    if (_query.isEmpty) return const [];
    return _infractions.where((i) => i._haystack.contains(_query)).toList();
  }

  void _openInfractionSheet(_SearchInfraction inf) {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: context.surfaceColor,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => _InfractionSheet(model: inf),
    );
  }

  @override
  Widget build(BuildContext context) {
    final fleetItems = context.watch<FleetCubit>().state.items;
    final vehicles = _filterVehicles(fleetItems);
    final drivers = _filterDrivers();
    final infractions = _filterInfractions();
    final hasQuery = _query.isNotEmpty;
    final totalResults =
        vehicles.length + drivers.length + infractions.length;

    final isWide = MediaQuery.sizeOf(context).width >= 900;

    final searchField = TextField(
      controller: _controller,
      autofocus: true,
      textInputAction: TextInputAction.search,
      onSubmitted: (v) => _saveSearch(v),
      style: TextStyle(
        color: context.textPrimaryColor,
        fontSize: isWide ? 15 : 14,
      ),
      decoration: InputDecoration(
        hintText: context.tr('search_hint'),
        prefixIcon: Icon(
          Icons.search_rounded,
          size: isWide ? 22 : 20,
          color: AppColors.primary,
        ),
        suffixIcon: _query.isEmpty
            ? null
            : IconButton(
                icon: const Icon(Icons.close_rounded),
                onPressed: () => _controller.clear(),
              ),
        filled: true,
        fillColor: context.cardColor,
        contentPadding: isWide
            ? const EdgeInsets.symmetric(horizontal: 18, vertical: 18)
            : const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(isWide ? 20 : 14),
          borderSide: BorderSide(color: context.dividerColor),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(isWide ? 20 : 14),
          borderSide: BorderSide(color: context.dividerColor),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(isWide ? 20 : 14),
          borderSide: const BorderSide(color: AppColors.primary, width: 1.6),
        ),
      ),
    );

    Widget resultsChild;
    if (_loading) {
      resultsChild = const ShimmerList(count: 4);
    } else if (!hasQuery) {
      resultsChild = _recentSearches.isEmpty
          ? _EmptyHint(
              title: context.tr('search'),
              subtitle: context.tr('search_hint'),
            )
          : _RecentSearchesPanel(
              searches: _recentSearches,
              onTap: _applySearch,
              onRemove: _removeSearch,
              onClear: _clearHistory,
            );
    } else if (totalResults == 0) {
      resultsChild = _EmptyHint(
        title: context.tr('no_results'),
        subtitle: context.tr('search_hint'),
        icon: Icons.search_off_rounded,
      );
    } else if (isWide) {
      resultsChild = _WebResultsGrid(
        vehicles: vehicles,
        drivers: drivers,
        infractions: infractions,
        onVehicleTap: (v) {
          _saveSearch(_controller.text.trim());
          context.push('/vehicles/${v.carId}');
        },
        onDriverTap: (d) {
          final name = Uri.encodeQueryComponent(
            d.name.isEmpty ? 'Driver' : d.name,
          );
          context.push('/drivers/${d.id}/behavior?name=$name');
        },
        onInfractionTap: _openInfractionSheet,
      );
    } else {
      resultsChild = ListView(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
        children: [
          if (vehicles.isNotEmpty) ...[
            _SectionHeader(
              title: '${context.tr('vehicles')} (${vehicles.length})',
            ),
            const SizedBox(height: 8),
            for (final v in vehicles)
              Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: _VehicleTile(
                  item: v,
                  onTap: () {
                    _saveSearch(_controller.text.trim());
                    context.push('/vehicles/${v.carId}');
                  },
                ),
              ),
            const SizedBox(height: 10),
          ],
          if (drivers.isNotEmpty) ...[
            _SectionHeader(
              title: '${context.tr('drivers')} (${drivers.length})',
            ),
            const SizedBox(height: 8),
            for (final d in drivers)
              Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: _DriverTile(
                  driver: d,
                  onTap: () {
                    final name = Uri.encodeQueryComponent(
                      d.name.isEmpty ? 'Driver' : d.name,
                    );
                    context.push('/drivers/${d.id}/behavior?name=$name');
                  },
                ),
              ),
            const SizedBox(height: 10),
          ],
          if (infractions.isNotEmpty) ...[
            _SectionHeader(
              title: '${context.tr('infractions')} (${infractions.length})',
            ),
            const SizedBox(height: 8),
            for (final i in infractions)
              Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: _InfractionTile(
                  model: i,
                  onTap: () => _openInfractionSheet(i),
                ),
              ),
          ],
        ],
      );
    }

    final body = Scaffold(
      backgroundColor: context.bgColor,
      appBar: isWide
          ? null
          : AppBar(
              backgroundColor: context.bgColor,
              elevation: 0,
              leading: IconButton(
                icon: const Icon(Icons.arrow_back_rounded),
                onPressed: () => context.pop(),
              ),
              title: Text(context.tr('search')),
            ),
      body: isWide
          ? Column(
              children: [
                const SizedBox(height: 20),
                Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 700),
                    child: SizedBox(
                      height: 56,
                      child: searchField,
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                Expanded(child: resultsChild),
              ],
            )
          : Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
                  child: searchField,
                ),
                Expanded(child: resultsChild),
              ],
            ),
    );

    return WebPageScaffold(
      title: context.tr('search'),
      subtitle: 'Search vehicles, drivers & events',
      scrollable: false,
      child: body,
    );
  }
}

// ---------------------------------------------------------------------------
// Recent search history panel
// ---------------------------------------------------------------------------

class _RecentSearchesPanel extends StatelessWidget {
  final List<String> searches;
  final ValueChanged<String> onTap;
  final ValueChanged<String> onRemove;
  final VoidCallback onClear;

  const _RecentSearchesPanel({
    required this.searches,
    required this.onTap,
    required this.onRemove,
    required this.onClear,
  });

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
      children: [
        // Header row
        Row(
          children: [
            Icon(Icons.history_rounded,
                size: 16, color: context.textMutedColor),
            const SizedBox(width: 6),
            Text(
              context.tr('recent_searches'),
              style: TextStyle(
                color: context.textMutedColor,
                fontSize: 11,
                fontWeight: FontWeight.w800,
                letterSpacing: 1,
              ),
            ),
            const Spacer(),
            TextButton(
              onPressed: onClear,
              style: TextButton.styleFrom(
                foregroundColor: AppColors.error,
                visualDensity: VisualDensity.compact,
                padding: const EdgeInsets.symmetric(horizontal: 8),
              ),
              child: Text(
                context.tr('clear_all'),
                style: const TextStyle(fontSize: 12),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        ...searches.asMap().entries.map((e) {
          final i = e.key;
          final query = e.value;
          return Padding(
            padding: const EdgeInsets.only(bottom: 6),
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                borderRadius: BorderRadius.circular(12),
                onTap: () => onTap(query),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(
                    gradient: context.cardGradientColor,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: context.dividerColor),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.search_rounded,
                          size: 16,
                          color: AppColors.primary.withValues(alpha: 0.8)),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          query,
                          style: TextStyle(
                            color: context.textPrimaryColor,
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      // Remove button
                      GestureDetector(
                        onTap: () => onRemove(query),
                        child: Padding(
                          padding: const EdgeInsets.only(left: 8),
                          child: Icon(Icons.close_rounded,
                              size: 16,
                              color: context.textMutedColor),
                        ),
                      ),
                      const SizedBox(width: 4),
                      Icon(Icons.north_west_rounded,
                          size: 14,
                          color:
                              context.textMutedColor.withValues(alpha: 0.6)),
                    ],
                  ),
                )
                    .animate(delay: (i * 40).ms)
                    .fadeIn(duration: 300.ms)
                    .slideY(begin: 0.05, end: 0, duration: 280.ms),
              ),
            ),
          );
        }),
        const SizedBox(height: 16),
        // Quick search suggestions
        Text(
          context.tr('quick_search'),
          style: TextStyle(
            color: context.textMutedColor,
            fontSize: 11,
            fontWeight: FontWeight.w800,
            letterSpacing: 1,
          ),
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            'truck', 'van', 'driver', 'moving', 'offline', 'speeding',
          ].map((s) => GestureDetector(
            onTap: () => onTap(s),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                    color: AppColors.primary.withValues(alpha: 0.3)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.tag_rounded,
                      size: 12, color: AppColors.primary),
                  const SizedBox(width: 4),
                  Text(
                    s,
                    style: const TextStyle(
                      color: AppColors.primary,
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ),
          )).toList(),
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------

class _SectionHeader extends StatelessWidget {
  final String title;
  const _SectionHeader({required this.title});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 4, top: 4),
      child: Text(
        title.toUpperCase(),
        style: TextStyle(
          color: context.textMutedColor,
          fontSize: 11,
          fontWeight: FontWeight.w800,
          letterSpacing: 1.2,
        ),
      ),
    );
  }
}

class _EmptyHint extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  const _EmptyHint({
    required this.title,
    required this.subtitle,
    this.icon = Icons.search_rounded,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: AppColors.primary, size: 32),
            ),
            const SizedBox(height: 16),
            Text(
              title,
              style: TextStyle(
                color: context.textPrimaryColor,
                fontSize: 18,
                fontWeight: FontWeight.w800,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 6),
            Text(
              subtitle,
              style: TextStyle(
                color: context.textSecondaryColor,
                fontSize: 13,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

class _VehicleTile extends StatelessWidget {
  final FleetItem item;
  final VoidCallback onTap;
  const _VehicleTile({required this.item, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final color = AppColors.statusColor(item.movementStatus);
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            gradient: context.cardGradientColor,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: context.dividerColor),
          ),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.18),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  Icons.directions_car_rounded,
                  color: color,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.carName.isEmpty
                          ? context.tr('unnamed_vehicle')
                          : item.carName,
                      style: TextStyle(
                        color: context.textPrimaryColor,
                        fontSize: 14,
                        fontWeight: FontWeight.w800,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      item.licensePlate,
                      style: TextStyle(
                        color: context.textMutedColor,
                        fontSize: 11,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: color.withValues(alpha: 0.18),
                      borderRadius: BorderRadius.circular(999),
                      border: Border.all(
                        color: color.withValues(alpha: 0.45),
                      ),
                    ),
                    child: Text(
                      item.movementStatus.toUpperCase(),
                      style: TextStyle(
                        color: color,
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${item.speedKmh.toStringAsFixed(0)} km/h',
                    style: TextStyle(
                      color: context.textSecondaryColor,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DriverTile extends StatelessWidget {
  final DriverModel driver;
  final VoidCallback onTap;
  const _DriverTile({required this.driver, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            gradient: context.cardGradientColor,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: context.dividerColor),
          ),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  gradient: AppColors.primaryGradient,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Center(
                  child: Text(
                    (driver.name.isNotEmpty ? driver.name[0] : 'D')
                        .toUpperCase(),
                    style: const TextStyle(
                      color: Colors.black,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      driver.name.isEmpty
                          ? context.tr('driver')
                          : driver.name,
                      style: TextStyle(
                        color: context.textPrimaryColor,
                        fontSize: 14,
                        fontWeight: FontWeight.w800,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      driver.phone ?? driver.email ?? '—',
                      style: TextStyle(
                        color: context.textMutedColor,
                        fontSize: 11,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              Icon(
                Icons.chevron_right_rounded,
                color: context.textMutedColor,
                size: 20,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _InfractionTile extends StatelessWidget {
  final _SearchInfraction model;
  final VoidCallback onTap;
  const _InfractionTile({required this.model, required this.onTap});

  Color _typeColor() {
    switch (model.type) {
      case 'speeding':
        return AppColors.error;
      case 'parking':
        return AppColors.secondary;
      case 'signal':
        return AppColors.warning;
      default:
        return AppColors.accent;
    }
  }

  String _typeLabel(BuildContext context) {
    switch (model.type) {
      case 'speeding':
        return context.tr('speeding');
      case 'parking':
        return context.tr('parking');
      case 'signal':
        return context.tr('signal');
      default:
        return context.tr('other');
    }
  }

  @override
  Widget build(BuildContext context) {
    final color = _typeColor();
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            gradient: context.cardGradientColor,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: context.dividerColor),
          ),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.18),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  Icons.receipt_long_rounded,
                  color: color,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _typeLabel(context),
                      style: TextStyle(
                        color: context.textPrimaryColor,
                        fontSize: 14,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      model.vehicleName.isEmpty ? '—' : model.vehicleName,
                      style: TextStyle(
                        color: context.textMutedColor,
                        fontSize: 11,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              Text(
                model.amount.toStringAsFixed(2),
                style: TextStyle(
                  color: context.textPrimaryColor,
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _InfractionSheet extends StatelessWidget {
  final _SearchInfraction model;
  const _InfractionSheet({required this.model});

  String _typeLabel(BuildContext context) {
    switch (model.type) {
      case 'speeding':
        return context.tr('speeding');
      case 'parking':
        return context.tr('parking');
      case 'signal':
        return context.tr('signal');
      default:
        return context.tr('other');
    }
  }

  String _statusLabel(BuildContext context) {
    switch (model.status) {
      case 'paid':
        return context.tr('paid');
      case 'contested':
        return context.tr('contested');
      default:
        return context.tr('pending');
    }
  }

  Color _statusColor() {
    switch (model.status) {
      case 'paid':
        return AppColors.success;
      case 'contested':
        return AppColors.secondary;
      default:
        return AppColors.warning;
    }
  }

  @override
  Widget build(BuildContext context) {
    final statusColor = _statusColor();
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 44,
              height: 4,
              decoration: BoxDecoration(
                color: context.textMutedColor,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 18),
          Row(
            children: [
              Expanded(
                child: Text(
                  context.tr('infraction'),
                  style: Theme.of(context).textTheme.titleLarge,
                ),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.18),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: statusColor.withValues(alpha: 0.5),
                  ),
                ),
                child: Text(
                  _statusLabel(context),
                  style: TextStyle(
                    color: statusColor,
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _SheetRow(
            label: context.tr('infraction_type'),
            value: _typeLabel(context),
          ),
          _SheetRow(
            label: context.tr('vehicle'),
            value: model.vehicleName.isEmpty ? '—' : model.vehicleName,
          ),
          _SheetRow(
            label: context.tr('driver'),
            value: model.driverName.isEmpty ? '—' : model.driverName,
          ),
          _SheetRow(
            label: context.tr('date'),
            value: DateFormat('MMM d, yyyy').format(model.date),
          ),
          _SheetRow(
            label: context.tr('fine_amount'),
            value: model.amount.toStringAsFixed(2),
          ),
          if (model.description.isNotEmpty)
            _SheetRow(
              label: context.tr('description'),
              value: model.description,
            ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () => Navigator.pop(context),
              child: Text(context.tr('close')),
            ),
          ),
        ],
      ),
    );
  }
}

class _SheetRow extends StatelessWidget {
  final String label;
  final String value;
  const _SheetRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 110,
            child: Text(
              label,
              style: TextStyle(
                color: context.textMutedColor,
                fontSize: 12,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: TextStyle(
                color: context.textPrimaryColor,
                fontSize: 13,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Web-only results grid (2-3 columns depending on available width)
// ---------------------------------------------------------------------------

class _WebResultsGrid extends StatelessWidget {
  final List<FleetItem> vehicles;
  final List<DriverModel> drivers;
  final List<_SearchInfraction> infractions;
  final ValueChanged<FleetItem> onVehicleTap;
  final ValueChanged<DriverModel> onDriverTap;
  final ValueChanged<_SearchInfraction> onInfractionTap;

  const _WebResultsGrid({
    required this.vehicles,
    required this.drivers,
    required this.infractions,
    required this.onVehicleTap,
    required this.onDriverTap,
    required this.onInfractionTap,
  });

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth;
        // 2 cols below 1200, 3 cols at/above 1200
        final columns = width >= 1200 ? 3 : 2;
        const gap = 14.0;
        final tileWidth = (width - (columns - 1) * gap - 32) / columns;

        Widget buildSection(String title, List<Widget> tiles) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _SectionHeader(title: title),
              const SizedBox(height: 10),
              Wrap(
                spacing: gap,
                runSpacing: gap,
                children: [
                  for (final t in tiles)
                    SizedBox(width: tileWidth, child: t),
                ],
              ),
              const SizedBox(height: 18),
            ],
          );
        }

        return ListView(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
          children: [
            if (vehicles.isNotEmpty)
              buildSection(
                '${context.tr('vehicles')} (${vehicles.length})',
                [
                  for (final v in vehicles)
                    _VehicleTile(item: v, onTap: () => onVehicleTap(v)),
                ],
              ),
            if (drivers.isNotEmpty)
              buildSection(
                '${context.tr('drivers')} (${drivers.length})',
                [
                  for (final d in drivers)
                    _DriverTile(driver: d, onTap: () => onDriverTap(d)),
                ],
              ),
            if (infractions.isNotEmpty)
              buildSection(
                '${context.tr('infractions')} (${infractions.length})',
                [
                  for (final i in infractions)
                    _InfractionTile(model: i, onTap: () => onInfractionTap(i)),
                ],
              ),
          ],
        );
      },
    );
  }
}
