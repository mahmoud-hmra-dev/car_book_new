import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/constants/app_constants.dart';
import '../../../core/theme/app_colors.dart';
import '../../../l10n/app_localizations.dart';

/// Options for the map-type picker, in the order shown in the UI.
const List<MapType> kMapTypes = [
  MapType.normal,
  MapType.satellite,
  MapType.hybrid,
  MapType.terrain,
];

IconData mapTypeIcon(MapType t) {
  switch (t) {
    case MapType.satellite:
      return Icons.satellite_alt_rounded;
    case MapType.hybrid:
      return Icons.layers_rounded;
    case MapType.terrain:
      return Icons.terrain_rounded;
    case MapType.normal:
    case MapType.none:
      return Icons.map_rounded;
  }
}

String mapTypeLabel(BuildContext context, MapType t) {
  switch (t) {
    case MapType.satellite:
      return context.tr('satellite');
    case MapType.hybrid:
      return context.tr('hybrid');
    case MapType.terrain:
      return context.tr('terrain');
    case MapType.normal:
    case MapType.none:
      return context.tr('normal');
  }
}

/// Persists/loads the map type to SharedPreferences as an index into
/// [kMapTypes].
Future<MapType> loadSavedMapType() async {
  final prefs = await SharedPreferences.getInstance();
  final idx = prefs.getInt(AppConstants.mapTypeKey) ?? 0;
  if (idx < 0 || idx >= kMapTypes.length) return MapType.normal;
  return kMapTypes[idx];
}

Future<void> saveMapType(MapType type) async {
  final prefs = await SharedPreferences.getInstance();
  final idx = kMapTypes.indexOf(type);
  await prefs.setInt(AppConstants.mapTypeKey, idx < 0 ? 0 : idx);
}

/// A compact floating pill showing the current map type. Tapping opens a
/// small popup with all four options as tiles.
class MapTypeSelector extends StatelessWidget {
  final MapType current;
  final ValueChanged<MapType> onChanged;

  const MapTypeSelector({
    super.key,
    required this.current,
    required this.onChanged,
  });

  Future<void> _showMenu(BuildContext context) async {
    final RenderBox button = context.findRenderObject() as RenderBox;
    final RenderBox overlay =
        Overlay.of(context).context.findRenderObject() as RenderBox;
    final Offset pos = button.localToGlobal(Offset.zero, ancestor: overlay);
    final Size size = button.size;

    final picked = await showMenu<MapType>(
      context: context,
      position: RelativeRect.fromLTRB(
        pos.dx - 180 + size.width,
        pos.dy + size.height + 6,
        overlay.size.width - (pos.dx + size.width),
        overlay.size.height - pos.dy,
      ),
      color: context.surfaceColor,
      elevation: 8,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
      ),
      items: [
        for (final t in kMapTypes)
          PopupMenuItem<MapType>(
            value: t,
            height: 44,
            child: Row(
              children: [
                Icon(
                  mapTypeIcon(t),
                  size: 18,
                  color: t == current
                      ? AppColors.primary
                      : context.textSecondaryColor,
                ),
                const SizedBox(width: 10),
                Text(
                  mapTypeLabel(context, t),
                  style: TextStyle(
                    color: t == current
                        ? AppColors.primary
                        : context.textPrimaryColor,
                    fontWeight:
                        t == current ? FontWeight.w700 : FontWeight.w500,
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),
      ],
    );
    if (picked != null) onChanged(picked);
  }

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: () => _showMenu(context),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
          decoration: BoxDecoration(
            color: context.surfaceColor.withValues(alpha: 0.92),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: context.dividerColor),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(
                    alpha: context.isDarkMode ? 0.3 : 0.08),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(mapTypeIcon(current),
                  size: 18, color: AppColors.primary),
              const SizedBox(width: 6),
              Text(
                mapTypeLabel(context, current),
                style: TextStyle(
                  color: context.textPrimaryColor,
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(width: 2),
              Icon(Icons.arrow_drop_down_rounded,
                  size: 18, color: context.textSecondaryColor),
            ],
          ),
        ),
      ),
    );
  }
}

/// Tiny 2x2 grid of icon-only buttons suitable for overlaying on a compact
/// map (e.g. vehicle detail header).
class MapTypeGrid extends StatelessWidget {
  final MapType current;
  final ValueChanged<MapType> onChanged;

  const MapTypeGrid({
    super.key,
    required this.current,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: context.surfaceColor.withValues(alpha: 0.92),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: context.dividerColor),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(
                alpha: context.isDarkMode ? 0.3 : 0.08),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              _tinyBtn(context, kMapTypes[0]),
              const SizedBox(width: 4),
              _tinyBtn(context, kMapTypes[1]),
            ],
          ),
          const SizedBox(height: 4),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              _tinyBtn(context, kMapTypes[2]),
              const SizedBox(width: 4),
              _tinyBtn(context, kMapTypes[3]),
            ],
          ),
        ],
      ),
    );
  }

  Widget _tinyBtn(BuildContext context, MapType t) {
    final selected = t == current;
    return InkWell(
      borderRadius: BorderRadius.circular(8),
      onTap: () => onChanged(t),
      child: Container(
        width: 30,
        height: 30,
        decoration: BoxDecoration(
          color: selected
              ? AppColors.primary.withValues(alpha: 0.2)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: selected ? AppColors.primary : Colors.transparent,
            width: 1.2,
          ),
        ),
        child: Icon(
          mapTypeIcon(t),
          size: 16,
          color: selected ? AppColors.primary : context.textSecondaryColor,
        ),
      ),
    );
  }
}
