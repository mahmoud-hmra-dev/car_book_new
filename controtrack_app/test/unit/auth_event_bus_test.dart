import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:controtrack/core/services/auth_event_bus.dart';

void main() {
  group('AuthEventBus', () {
    // ── Singleton ─────────────────────────────────────────────────────────────

    test('instance returns the same singleton', () {
      final a = AuthEventBus.instance;
      final b = AuthEventBus.instance;
      expect(identical(a, b), isTrue);
    });

    // ── Broadcast stream ──────────────────────────────────────────────────────

    test('stream is a broadcast stream (multiple listeners allowed)', () {
      final bus = AuthEventBus.instance;
      // If stream were a single-subscription stream, the second listen would
      // throw a StateError.  With broadcast there is no error.
      final sub1 = bus.stream.listen((_) {});
      final sub2 = bus.stream.listen((_) {});
      addTearDown(() async {
        await sub1.cancel();
        await sub2.cancel();
      });
      expect(bus.stream.isBroadcast, isTrue);
    });

    // ── add401Event ───────────────────────────────────────────────────────────

    test('add401Event emits AuthEvent.tokenExpired', () async {
      final received = <AuthEvent>[];
      final completer = Completer<void>();

      final sub = AuthEventBus.instance.stream.listen((e) {
        received.add(e);
        if (!completer.isCompleted) completer.complete();
      });

      AuthEventBus.instance.add401Event();
      await completer.future.timeout(const Duration(seconds: 1));
      await sub.cancel();

      expect(received, [AuthEvent.tokenExpired]);
    });

    test('add401Event can be called multiple times', () async {
      final received = <AuthEvent>[];
      int count = 0;
      final completer = Completer<void>();

      final sub = AuthEventBus.instance.stream.listen((e) {
        received.add(e);
        count++;
        if (count >= 3 && !completer.isCompleted) completer.complete();
      });

      AuthEventBus.instance.add401Event();
      AuthEventBus.instance.add401Event();
      AuthEventBus.instance.add401Event();
      await completer.future.timeout(const Duration(seconds: 1));
      await sub.cancel();

      expect(received.length, 3);
      expect(received, everyElement(AuthEvent.tokenExpired));
    });

    test('multiple listeners all receive add401Event', () async {
      final received1 = <AuthEvent>[];
      final received2 = <AuthEvent>[];
      final c1 = Completer<void>();
      final c2 = Completer<void>();

      final sub1 = AuthEventBus.instance.stream.listen((e) {
        received1.add(e);
        if (!c1.isCompleted) c1.complete();
      });
      final sub2 = AuthEventBus.instance.stream.listen((e) {
        received2.add(e);
        if (!c2.isCompleted) c2.complete();
      });

      AuthEventBus.instance.add401Event();
      await Future.wait([
        c1.future.timeout(const Duration(seconds: 1)),
        c2.future.timeout(const Duration(seconds: 1)),
      ]);
      await sub1.cancel();
      await sub2.cancel();

      expect(received1, [AuthEvent.tokenExpired]);
      expect(received2, [AuthEvent.tokenExpired]);
    });

    // ── AuthEvent enum ────────────────────────────────────────────────────────

    test('AuthEvent.tokenExpired has the correct name', () {
      expect(AuthEvent.tokenExpired.name, 'tokenExpired');
    });

    test('AuthEvent values contains exactly one member', () {
      expect(AuthEvent.values.length, 1);
      expect(AuthEvent.values, contains(AuthEvent.tokenExpired));
    });
  });
}
