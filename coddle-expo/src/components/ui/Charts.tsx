import React, { useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Box, Text } from './index';
import { useTheme } from '@shopify/restyle';
import { Theme } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface ChartDataPoint {
  label: string;
  value: number;
  date?: Date;
}

interface SimpleBarChartProps {
  data: ChartDataPoint[];
  height?: number;
  color?: string;
  maxValue?: number;
  title?: string;
  unit?: string;
}

export const SimpleBarChart: React.FC<SimpleBarChartProps> = ({
  data,
  height = 200,
  color,
  maxValue,
  title,
  unit = '',
}) => {
  const theme = useTheme<Theme>();
  const barColor = color || theme.colors.primary;
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  
  if (data.length === 0) {
    return (
      <Box padding="xl" alignItems="center">
        <Ionicons name="bar-chart-outline" size={48} color={theme.colors.secondaryText} />
        <Text variant="body" color="secondaryText" textAlign="center" marginTop="m">
          No data available
        </Text>
      </Box>
    );
  }

  const max = maxValue || Math.max(...data.map(d => d.value), 1);
  const chartHeight = height - 50;
  const avg = data.reduce((sum, d) => sum + d.value, 0) / data.length;

  const handleBarPress = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedIndex(selectedIndex === index ? null : index);
  };

  // Calculate y-axis labels
  const yAxisSteps = 4;
  const yAxisLabels = Array.from({ length: yAxisSteps + 1 }, (_, i) => {
    const value = (max / yAxisSteps) * i;
    return value.toFixed(1);
  }).reverse();

  const barWidth = Math.max(24, Math.min(40, 300 / data.length));

  return (
    <Box>
      {title && (
        <Text variant="subtitle" marginBottom="s">{title}</Text>
      )}
      
      {/* Stats Row */}
      <Box flexDirection="row" justifyContent="space-around" marginBottom="m">
        <Box alignItems="center">
          <Text variant="caption" color="secondaryText">Average</Text>
          <Text variant="body" fontWeight="600">{avg.toFixed(1)}{unit}</Text>
        </Box>
        <Box alignItems="center">
          <Text variant="caption" color="secondaryText">Max</Text>
          <Text variant="body" fontWeight="600">{max.toFixed(1)}{unit}</Text>
        </Box>
        <Box alignItems="center">
          <Text variant="caption" color="secondaryText">Total</Text>
          <Text variant="body" fontWeight="600">{data.reduce((s, d) => s + d.value, 0).toFixed(1)}{unit}</Text>
        </Box>
      </Box>

      {/* Selected Value Tooltip */}
      {selectedIndex !== null && (
        <Box 
          backgroundColor="primaryLight" 
          padding="s" 
          borderRadius="s" 
          marginBottom="s"
          alignItems="center"
        >
          <Text variant="body" fontWeight="600" color="primary">
            {data[selectedIndex].label}: {data[selectedIndex].value.toFixed(1)}{unit}
          </Text>
        </Box>
      )}

      {/* Chart with Y-axis */}
      <Box flexDirection="row">
        {/* Y-axis labels */}
        <Box justifyContent="space-between" height={chartHeight} paddingRight="xs" paddingVertical="xs">
          {yAxisLabels.map((label, i) => (
            <Text key={i} variant="caption" color="secondaryText" style={{ fontSize: 9, lineHeight: 10 }}>
              {label}
            </Text>
          ))}
        </Box>

        {/* Chart area with bars and x-axis labels in sync */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
          <Box>
            {/* Bars */}
            <Box flexDirection="row" alignItems="flex-end" height={chartHeight} paddingHorizontal="xs">
              {data.map((point, index) => {
                const barHeight = (point.value / max) * chartHeight * 0.85;
                const isSelected = selectedIndex === index;
                
                return (
                  <Pressable key={index} onPress={() => handleBarPress(index)}>
                    <Box
                      alignItems="center"
                      justifyContent="flex-end"
                      marginHorizontal="xs"
                      style={{ width: barWidth + 8 }}
                    >
                      {/* Value label on top of bar */}
                      {point.value > 0 && isSelected && (
                        <Text variant="caption" marginBottom="xs" color="primary" fontWeight="600">
                          {point.value.toFixed(1)}
                        </Text>
                      )}
                      
                      {/* Bar */}
                      <View
                        style={{
                          width: barWidth,
                          height: Math.max(barHeight, 4),
                          backgroundColor: isSelected ? theme.colors.primary : barColor,
                          borderRadius: 6,
                          opacity: isSelected ? 1 : 0.8,
                        }}
                      />
                    </Box>
                  </Pressable>
                );
              })}
            </Box>

            {/* X-axis labels (synchronized with bars) */}
            <Box flexDirection="row" marginTop="s" paddingHorizontal="xs">
              {data.map((point, index) => (
                <Box key={index} alignItems="center" marginHorizontal="xs" style={{ width: barWidth + 8 }}>
                  <Text 
                    variant="caption" 
                    color={selectedIndex === index ? 'primary' : 'secondaryText'} 
                    textAlign="center" 
                    numberOfLines={1}
                    style={{ fontSize: 10 }}
                  >
                    {point.label}
                  </Text>
                </Box>
              ))}
            </Box>
          </Box>
        </ScrollView>
      </Box>
    </Box>
  );
};

// Date Range Options
export type DateRangeOption = '7d' | '14d' | '28d' | '90d';

interface DateRangeSelectorProps {
  selected: DateRangeOption;
  onChange: (range: DateRangeOption) => void;
}

export const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({ selected, onChange }) => {
  const theme = useTheme<Theme>();
  const options: { value: DateRangeOption; label: string }[] = [
    { value: '7d', label: '7 Days' },
    { value: '14d', label: '14 Days' },
    { value: '28d', label: '28 Days' },
    { value: '90d', label: '90 Days' },
  ];

  return (
    <Box flexDirection="row" backgroundColor="mainBackground" borderRadius="m" padding="xs">
      {options.map((option) => (
        <Pressable
          key={option.value}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onChange(option.value);
          }}
          style={{ flex: 1 }}
        >
          <Box
            backgroundColor={selected === option.value ? 'cardBackground' : 'transparent'}
            padding="s"
            borderRadius="s"
            alignItems="center"
            shadowColor={selected === option.value ? 'black' : 'transparent'}
            shadowOpacity={selected === option.value ? 0.1 : 0}
            shadowRadius={4}
            shadowOffset={{ width: 0, height: 2 }}
          >
            <Text
              variant="caption"
              color={selected === option.value ? 'primary' : 'secondaryText'}
              fontWeight={selected === option.value ? '600' : '400'}
            >
              {option.label}
            </Text>
          </Box>
        </Pressable>
      ))}
    </Box>
  );
};

// Line Chart for Trends
interface LineChartProps {
  data: ChartDataPoint[];
  height?: number;
  color?: string;
  showArea?: boolean;
}

export const SimpleLineChart: React.FC<LineChartProps> = ({
  data,
  height = 150,
  color,
  showArea = true,
}) => {
  const theme = useTheme<Theme>();
  const lineColor = color || theme.colors.primary;

  if (data.length < 2) {
    return (
      <Box padding="l" alignItems="center">
        <Text variant="caption" color="secondaryText">
          Need at least 2 data points
        </Text>
      </Box>
    );
  }

  const max = Math.max(...data.map(d => d.value), 1);
  const min = Math.min(...data.map(d => d.value), 0);
  const range = max - min || 1;
  const chartHeight = height - 30;

  // Y-axis labels
  const yAxisSteps = 4;
  const yAxisLabels = Array.from({ length: yAxisSteps + 1 }, (_, i) => {
    const value = min + (range / yAxisSteps) * i;
    return value.toFixed(1);
  }).reverse();

  // Determine which x-axis labels to show based on data length
  const showEveryNth = data.length > 14 ? Math.ceil(data.length / 7) : 
                       data.length > 7 ? 2 : 1;

  return (
    <Box>
      <Box flexDirection="row">
        {/* Y-axis labels */}
        <Box justifyContent="space-between" height={chartHeight} paddingRight="xs" paddingVertical="xs">
          {yAxisLabels.map((label, i) => (
            <Text key={i} variant="caption" color="secondaryText" style={{ fontSize: 9, lineHeight: 10 }}>
              {label}
            </Text>
          ))}
        </Box>

        {/* Chart area */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
          <Box>
            {/* Line and dots */}
            <Box height={chartHeight} flexDirection="row" alignItems="flex-end">
              {data.map((point, index) => {
                const normalizedHeight = ((point.value - min) / range) * (chartHeight - 20);
                const dotSize = 8;
                const columnWidth = Math.max(30, 400 / data.length);
                
                return (
                  <Box 
                    key={index} 
                    width={columnWidth} 
                    height={chartHeight} 
                    justifyContent="flex-end" 
                    alignItems="center"
                  >
                    {/* Dot */}
                    <View
                      style={{
                        width: dotSize,
                        height: dotSize,
                        borderRadius: dotSize / 2,
                        backgroundColor: lineColor,
                        position: 'absolute',
                        bottom: normalizedHeight,
                        zIndex: 2,
                      }}
                    />
                    {/* Stem */}
                    {showArea && (
                      <View
                        style={{
                          width: 2,
                          height: normalizedHeight,
                          backgroundColor: lineColor + '40',
                          borderTopLeftRadius: 1,
                          borderTopRightRadius: 1,
                        }}
                      />
                    )}
                    {/* Connection line to next point */}
                    {index < data.length - 1 && (
                      <View
                        style={{
                          position: 'absolute',
                          bottom: normalizedHeight,
                          left: columnWidth / 2,
                          width: columnWidth,
                          height: 2,
                          backgroundColor: lineColor,
                          zIndex: 1,
                        }}
                      />
                    )}
                  </Box>
                );
              })}
            </Box>
            
            {/* X-axis labels (show subset for readability) */}
            <Box flexDirection="row" marginTop="s">
              {data.map((point, index) => {
                const columnWidth = Math.max(30, 400 / data.length);
                const shouldShow = index % showEveryNth === 0 || index === data.length - 1;
                
                return (
                  <Box key={index} width={columnWidth} alignItems="center">
                    {shouldShow && (
                      <Text 
                        variant="caption" 
                        color="secondaryText" 
                        textAlign="center" 
                        style={{ fontSize: 9 }}
                      >
                        {point.label}
                      </Text>
                    )}
                  </Box>
                );
              })}
            </Box>
          </Box>
        </ScrollView>
      </Box>
    </Box>
  );
};
