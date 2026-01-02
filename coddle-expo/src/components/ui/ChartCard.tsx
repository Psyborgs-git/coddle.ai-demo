import React from 'react';
import { View, ScrollView, useWindowDimensions } from 'react-native';
import { VictoryChart, VictoryAxis, VictoryLabel, VictoryTheme } from 'victory-native';
import { useTheme } from '@shopify/restyle';

interface ChartCardProps {
  children: React.ReactNode;
  dataLength: number;
  leftAxisTicks?: number[] | string[];
  leftAxisFormat?: (v: any) => string;
  leftAxisDomainMax?: number;
  height?: number;
  minPointSpacing?: number;
}

const LEFT_AXIS_WIDTH = 80;
const DEFAULT_MIN_POINT_SPACING = 28;
const DEFAULT_HEIGHT = 280;

export const ChartCard: React.FC<ChartCardProps> = ({
  children,
  dataLength,
  leftAxisTicks,
  leftAxisFormat,
  leftAxisDomainMax,
  height = DEFAULT_HEIGHT,
  minPointSpacing = DEFAULT_MIN_POINT_SPACING,
}) => {
  const { width } = useWindowDimensions();
  const theme = useTheme();
  const chartWidth = Number.isFinite(width) ? Math.min(width - 32, 600) : 320;
  const contentWidthUnclamped = Math.max(chartWidth, ((dataLength && dataLength > 0) ? dataLength : 1) * minPointSpacing + LEFT_AXIS_WIDTH + 40);
  const contentWidth = Number.isFinite(contentWidthUnclamped) ? Math.floor(contentWidthUnclamped) : chartWidth;

  return (
    <View style={{ marginVertical: 12 }}>
      <View
        style={{
          backgroundColor: theme.colors.cardBackground,
          borderRadius: 16,
          overflow: 'hidden',
          marginHorizontal: 16,
          paddingVertical: 16,
          paddingHorizontal: 8,
          shadowColor: '#000',
          shadowOpacity: 0.08,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 4 },
          elevation: 4,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          {/* Left sticky Y axis */}
          <View style={{ width: LEFT_AXIS_WIDTH, height, paddingLeft: 8 }} pointerEvents="none">
            <VictoryChart
              width={LEFT_AXIS_WIDTH}
              height={height}
              padding={{ top: 24, bottom: 48, left: 0, right: 0 }}
              theme={VictoryTheme.clean}
              domain={{ y: [0, leftAxisDomainMax || 16] }}
            >
              <VictoryAxis
                dependentAxis
                tickFormat={(tick) => (leftAxisFormat ? leftAxisFormat(tick) : `${Math.round(tick as number)}h`)}
                tickLabelComponent={<VictoryLabel textAnchor="end" dx={-8} />}
                offsetX={LEFT_AXIS_WIDTH - 8}
                style={{
                  axis: { stroke: 'transparent' },
                  ticks: { stroke: 'transparent' },
                  grid: { stroke: 'transparent' },
                  tickLabels: {
                    fontSize: 11,
                    fill: '#6B7280',
                    padding: 8,
                  },
                }}
              />
            </VictoryChart>
          </View>

          {/* Scrollable chart area */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ width: contentWidth, height, paddingHorizontal: 8 }}>{children}</View>
          </ScrollView>
        </View>
      </View>
    </View>
  );
};

export default ChartCard;
