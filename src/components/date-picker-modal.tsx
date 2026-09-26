import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const ORANGE = '#E85D04';
const TEXT = '#111827';
const SECONDARY = '#6b7280';
const DISABLED = '#d1d5db';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MIN_YEAR = 1900;

const pad = (n: number) => String(n).padStart(2, '0');

/** Formats a date as YYYY-MM-DD (local time). */
export const toISODate = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const parseISODate = (value: string): Date | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
};

type Props = {
  visible: boolean;
  value: string; // YYYY-MM-DD or ''
  onSelect: (value: string) => void;
  onClose: () => void;
  maxDate?: Date;
  defaultYear?: number;
};

export default function DatePickerModal({
  visible,
  value,
  onSelect,
  onClose,
  maxDate = new Date(),
  defaultYear = 2000,
}: Props) {
  const selected = parseISODate(value);
  const [viewYear, setViewYear] = useState(selected?.getFullYear() ?? defaultYear);
  const [viewMonth, setViewMonth] = useState(selected?.getMonth() ?? 0);
  const [mode, setMode] = useState<'day' | 'year'>('day');

  // Reset the view to the selected date each time the picker opens
  useEffect(() => {
    if (!visible) return;
    const d = parseISODate(value);
    setViewYear(d?.getFullYear() ?? defaultYear);
    setViewMonth(d?.getMonth() ?? 0);
    setMode('day');
  }, [visible]);

  const maxYear = maxDate.getFullYear();
  const maxMonth = maxDate.getMonth();
  const canGoNext = viewYear < maxYear || (viewYear === maxYear && viewMonth < maxMonth);
  const canGoPrev = viewYear > MIN_YEAR || viewMonth > 0;

  const shiftMonth = (delta: number) => {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  const pickYear = (y: number) => {
    setViewYear(y);
    if (y === maxYear && viewMonth > maxMonth) setViewMonth(maxMonth);
    setMode('day');
  };

  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const years = Array.from({ length: maxYear - MIN_YEAR + 1 }, (_, i) => maxYear - i);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* Inner Pressable swallows taps so they don't close the modal */}
        <Pressable style={styles.card} onPress={() => {}}>
          {/* ── Header ── */}
          <View style={styles.header}>
            <Pressable
              hitSlop={10}
              disabled={mode === 'year' || !canGoPrev}
              onPress={() => shiftMonth(-1)}>
              <Text style={[styles.arrow, (mode === 'year' || !canGoPrev) && styles.arrowDisabled]}>‹</Text>
            </Pressable>
            <Pressable onPress={() => setMode(mode === 'day' ? 'year' : 'day')}>
              <Text style={styles.headerText}>
                {MONTHS[viewMonth]} {viewYear} ▾
              </Text>
            </Pressable>
            <Pressable
              hitSlop={10}
              disabled={mode === 'year' || !canGoNext}
              onPress={() => shiftMonth(1)}>
              <Text style={[styles.arrow, (mode === 'year' || !canGoNext) && styles.arrowDisabled]}>›</Text>
            </Pressable>
          </View>

          {mode === 'year' ? (
            <ScrollView style={styles.yearScroll} contentContainerStyle={styles.yearGrid}>
              {years.map((y) => (
                <Pressable
                  key={y}
                  style={[styles.yearCell, y === viewYear && styles.cellActive]}
                  onPress={() => pickYear(y)}>
                  <Text style={[styles.cellText, y === viewYear && styles.cellTextActive]}>{y}</Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.grid}>
              {WEEKDAYS.map((w) => (
                <View key={w} style={styles.dayCell}>
                  <Text style={styles.weekday}>{w}</Text>
                </View>
              ))}
              {cells.map((day, i) => {
                if (day === null) return <View key={`e${i}`} style={styles.dayCell} />;
                const date = new Date(viewYear, viewMonth, day);
                const disabled = date > maxDate;
                const isSelected = !!selected && selected.getTime() === date.getTime();
                return (
                  <Pressable
                    key={day}
                    style={styles.dayCell}
                    disabled={disabled}
                    onPress={() => {
                      onSelect(toISODate(date));
                      onClose();
                    }}>
                    <View style={[styles.dayInner, isSelected && styles.cellActive]}>
                      <Text
                        style={[
                          styles.cellText,
                          disabled && { color: DISABLED },
                          isSelected && styles.cellTextActive,
                        ]}>
                        {day}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          <Pressable style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 16 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerText: { fontSize: 16, fontWeight: '700', color: TEXT },
  arrow: { fontSize: 28, color: ORANGE, paddingHorizontal: 8, lineHeight: 30 },
  arrowDisabled: { color: DISABLED },

  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dayInner: {
    width: '85%',
    aspectRatio: 1,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekday: { fontSize: 12, fontWeight: '600', color: SECONDARY },

  yearScroll: { maxHeight: 300 },
  yearGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  yearCell: {
    width: '33.33%',
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },

  cellText: { fontSize: 14, color: TEXT },
  cellActive: { backgroundColor: ORANGE },
  cellTextActive: { color: '#fff', fontWeight: '700' },

  cancelBtn: { alignSelf: 'flex-end', marginTop: 8, paddingVertical: 8, paddingHorizontal: 12 },
  cancelText: { fontSize: 14, fontWeight: '600', color: ORANGE },
});
