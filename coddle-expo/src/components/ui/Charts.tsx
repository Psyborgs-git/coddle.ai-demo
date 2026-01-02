import React, { useMemo, useState } from "react";
import {
	View,
	ScrollView,
	Text,
	useWindowDimensions,
	TouchableOpacity,
	Animated,
} from "react-native";
import type { ViewStyle } from "react-native";
import {
	VictoryChart,
	VictoryBar,
	VictoryArea,
	VictoryAxis,
	VictoryLabel,
	VictoryTheme,
	VictoryTooltip,
	VictoryVoronoiContainer,
} from "victory-native";
import { useTheme } from "@shopify/restyle";
import ChartCard from "./ChartCard";

export type DateRangeOption = "7d" | "14d" | "28d" | "90d";

interface ChartData {
	x: string;
	y: number;
}

interface SimpleBarChartProps {
	data: ChartData[];
	title?: string;
	yAxisLabel?: string;
	color?: string;
	height?: number;
	interactive?: boolean;
}

interface SimpleLineChartProps {
	data: ChartData[];
	title?: string;
	yAxisLabel?: string;
	color?: string;
	height?: number;
	interactive?: boolean;
}

interface AreaChartProps {
	data: ChartData[];
	title?: string;
	yAxisLabel?: string;
	color?: string;
	height?: number;
	interactive?: boolean;
}

// Modern gradient colors
const GRADIENT_COLORS = {
	primary: "#6366F1", // Indigo
	success: "#10B981", // Emerald
	accent: "#8B5CF6", // Violet
	highlight: "#F59E0B", // Amber
};

// Modern chart styling theme
const modernChartTheme = {
	...VictoryTheme.clean,
	axis: {
		...VictoryTheme.clean.axis,
		style: {
			axis: {
				stroke: "#E5E7EB",
				strokeWidth: 1.5,
			},
			axisLabel: {
				fontSize: 12,
				fontWeight: "600",
				fill: "#6B7280",
				padding: 12,
			},
			grid: {
				stroke: "#F3F4F6",
				strokeWidth: 1,
				strokeDasharray: "0",
			},
			ticks: {
				stroke: "#D1D5DB",
				size: 5,
				strokeWidth: 1.5,
			},
			tickLabels: {
				fontSize: 11,
				fill: "#9CA3AF",
				padding: 6,
				fontWeight: "500",
			},
		},
	},
	dependentAxis: {
		style: {
			axis: {
				stroke: "#E5E7EB",
				strokeWidth: 1.5,
			},
			axisLabel: {
				fontSize: 12,
				fontWeight: "600",
				fill: "#6B7280",
				padding: 12,
			},
			grid: {
				stroke: "#F3F4F6",
				strokeWidth: 1,
			},
			ticks: {
				stroke: "#D1D5DB",
				size: 5,
				strokeWidth: 1.5,
			},
			tickLabels: {
				fontSize: 11,
				fill: "#9CA3AF",
				padding: 6,
				fontWeight: "500",
			},
		},
	},
};

// Shared chart constants and card styling to keep charts consistent
const LEFT_AXIS_WIDTH = 80;
const MIN_POINT_SPACING = 28;
const DEFAULT_CHART_HEIGHT = 280;

export const SimpleBarChart: React.FC<SimpleBarChartProps> = ({
	data,
	title,
	yAxisLabel,
	color = GRADIENT_COLORS.primary,
	height = 320,
	interactive = true,
}) => {
	const { width } = useWindowDimensions();
	const chartWidth = Number.isFinite(width) ? Math.min(width - 32, 600) : 320;
	const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

	const maxValue = useMemo(() => {
		const values = data.map((d) => d.y);
		return Math.max(...values, 1);
	}, [data]);

	const chartData = useMemo(() => {
		return data.length > 0
			? data
			: [
					{ x: "No Data", y: 0 },
					{ x: "", y: 0 },
			  ];
	}, [data]);

	// Calculate average for reference line
	const average = useMemo(() => {
		if (data.length === 0) return 0;
		const sum = data.reduce((acc, d) => acc + d.y, 0);
		return sum / data.length;
	}, [data]);

	// Theming & layout
	const restyleTheme = useTheme();
	const barColor =
		color ||
		(restyleTheme?.colors?.primary as string) ||
		GRADIENT_COLORS.primary;

	const contentWidthUnclamped = Math.max(
		chartWidth,
		(data && data.length ? data.length : 1) * MIN_POINT_SPACING +
			LEFT_AXIS_WIDTH +
			40
	);
	const contentWidth = Number.isFinite(contentWidthUnclamped)
		? Math.floor(contentWidthUnclamped)
		: chartWidth;

	return (
		<View style={{ marginVertical: 12 }}>
			{title && (
				<View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
					<Text
						style={{
							fontSize: 16,
							fontWeight: "700",
							color: restyleTheme.colors.primaryText,
							letterSpacing: -0.3,
						}}
					>
						{title}
					</Text>
					{average > 0 && (
						<Text
							style={{
								fontSize: 12,
								fontWeight: "500",
								color: "#6B7280",
								marginTop: 4,
							}}
						>
							Average: {average.toFixed(1)}h/day
						</Text>
					)}
				</View>
			)}
			<ChartCard
				dataLength={data.length}
				leftAxisDomainMax={Math.max(maxValue * 1.15, 16)}
				height={height}
			>
				<VictoryChart
					width={contentWidth}
					height={height}
					padding={{
						top: 24,
						bottom: 48,
					}}
					theme={modernChartTheme}
					domain={{ y: [0, Math.max(maxValue * 1.15, 18)] }}
					domainPadding={{ x: Math.floor(MIN_POINT_SPACING / 2), y: 0 }}
				>
					<VictoryAxis
						tickFormat={(tick) => String(tick)}
						style={{
							tickLabels: {
								fontSize: 10,
								angle: -45,
								textAnchor: "end",
								fill: "#6B7280",
							},
						}}
					/>
					{/* dependentAxis intentionally omitted from the scrollable chart to keep y-axis sticky */}
					<VictoryBar
						data={chartData}
						x="x"
						y="y"
						style={{
							data: {
								fill: ({ index }) =>
									hoveredIndex === index ? barColor : barColor,
								fillOpacity: ({ index }) => (hoveredIndex === index ? 1 : 0.85),
								stroke: ({ index }) =>
									hoveredIndex === index ? barColor : "transparent",
								strokeWidth: ({ index }) => (hoveredIndex === index ? 2 : 0),
							},
						}}
						cornerRadius={{ top: 8, bottom: 0 }}
						barWidth={({ index }) =>
							hoveredIndex === index
								? Math.max(18, MIN_POINT_SPACING - 6)
								: Math.max(14, MIN_POINT_SPACING - 10)
						}
						labels={({ datum }) =>
							interactive ? `${datum.y.toFixed(1)}h` : ""
						}
						events={
							interactive
								? [
										{
											target: "data",
											eventHandlers: {
												onPressIn: () => {
													return [
														{
															target: "data",
															mutation: (props) => {
																setHoveredIndex(props.index);
																return null;
															},
														},
													];
												},
												onPressOut: () => {
													setHoveredIndex(null);
													return [];
												},
											},
										},
								  ]
								: []
						}
						labelComponent={
							interactive ? (
								<VictoryTooltip
									style={{
										fontSize: 12,
										fill: "#FFFFFF",
										fontWeight: "700",
									}}
									flyoutStyle={{
										fill: "#1F2937",
										stroke: barColor,
										strokeWidth: 2,
										rx: 8,
									}}
									flyoutPadding={{ top: 6, bottom: 6, left: 12, right: 12 }}
									centerOffset={{ y: -10 }}
								/>
							) : undefined
						}
					/>
				</VictoryChart>
			</ChartCard>
		</View>
	);
};

export const SimpleLineChart: React.FC<SimpleLineChartProps> = ({
	data,
	title,
	yAxisLabel,
	color = GRADIENT_COLORS.accent,
	height = DEFAULT_CHART_HEIGHT,
	interactive = true,
}) => {
	const { width } = useWindowDimensions();
	const chartWidth = Number.isFinite(width) ? Math.min(width - 32, 600) : 320;

	const maxValue = useMemo(() => {
		const values = data.map((d) => d.y);
		return Math.max(...values, 1);
	}, [data]);

	const chartData = useMemo(() => {
		return data.length > 0
			? data
			: [
					{ x: "No Data", y: 0 },
					{ x: "", y: 0 },
			  ];
	}, [data]);

	// Theming & layout
	const restyleTheme = useTheme();
	const lineColor =
		color || (restyleTheme?.colors?.accent as string) || GRADIENT_COLORS.accent;
	const LEFT_AXIS_WIDTH = 80;
	const MIN_POINT_SPACING = 28;
	const contentWidthUnclamped = Math.max(
		chartWidth,
		(data && data.length ? data.length : 1) * MIN_POINT_SPACING +
			LEFT_AXIS_WIDTH +
			40
	);
	const contentWidth = Number.isFinite(contentWidthUnclamped)
		? Math.floor(contentWidthUnclamped)
		: chartWidth;

	return (
		<View style={{ marginVertical: 12 }}>
			{title && (
				<View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
					<Text
						style={{
							fontSize: 16,
							fontWeight: "700",
							color: restyleTheme.colors.primaryText,
							letterSpacing: -0.3,
						}}
					>
						{title}
					</Text>
				</View>
			)}
			<ChartCard
				dataLength={data.length}
				leftAxisDomainMax={Math.max(maxValue * 1.2, 16)}
				height={height}
			>
				<VictoryChart
					width={contentWidth}
					height={height}
					padding={{
						top: 24,
						bottom: 48,
						left: 8,
						right: 24,
					}}
					theme={modernChartTheme}
					domain={{ y: [0, maxValue * 1.2] }}
					containerComponent={
						interactive ? (
							<VictoryVoronoiContainer
								voronoiDimension="x"
								labels={({ datum }) => `${datum.y}h`}
								labelComponent={
									<VictoryTooltip
										style={{
											fontSize: 12,
											fill: "#FFFFFF",
											fontWeight: "700",
										}}
										flyoutStyle={{
											fill: "#1F2937",
											stroke: lineColor,
											strokeWidth: 2,
											rx: 8,
										}}
										flyoutPadding={{ top: 8, bottom: 8, left: 14, right: 14 }}
										cornerRadius={8}
									/>
								}
							/>
						) : undefined
					}
				>
					<VictoryAxis
						tickFormat={(tick) => String(tick)}
						style={{
							tickLabels: {
								fontSize: 10,
								angle: -45,
								textAnchor: "end",
								fill: "#6B7280",
							},
						}}
					/>
					{/* dependentAxis intentionally omitted to keep y-axis sticky */}
					<VictoryArea
						data={chartData}
						x="x"
						y="y"
						style={{
							data: {
								fill: lineColor,
								fillOpacity: 0.15,
								stroke: lineColor,
								strokeWidth: 2.5,
							},
						}}
						interpolation="monotoneX"
					/>
				</VictoryChart>
			</ChartCard>
		</View>
	);
};

export const AreaChart: React.FC<AreaChartProps> = ({
	data,
	title,
	yAxisLabel,
	color = GRADIENT_COLORS.success,
	height = DEFAULT_CHART_HEIGHT,
	interactive = true,
}) => {
	const { width } = useWindowDimensions();
	const chartWidth = Number.isFinite(width) ? Math.min(width - 32, 600) : 320;

	const maxValue = useMemo(() => {
		const values = data.map((d) => d.y);
		return Math.max(...values, 1);
	}, [data]);

	const chartData = useMemo(() => {
		return data.length > 0
			? data
			: [
					{ x: "No Data", y: 0 },
					{ x: "", y: 0 },
			  ];
	}, [data]);

	// Calculate trend stats
	const stats = useMemo(() => {
		if (data.length === 0) return { avg: 0, trend: "stable" };
		const sum = data.reduce((acc, d) => acc + d.y, 0);
		const avg = sum / data.length;

		// Simple trend calculation (first half vs second half)
		const mid = Math.floor(data.length / 2);
		const firstHalf = data.slice(0, mid);
		const secondHalf = data.slice(mid);
		const firstAvg =
			firstHalf.reduce((acc, d) => acc + d.y, 0) / firstHalf.length;
		const secondAvg =
			secondHalf.reduce((acc, d) => acc + d.y, 0) / secondHalf.length;
		const diff = secondAvg - firstAvg;

		let trend = "stable";
		if (diff > 0.5) trend = "increasing";
		else if (diff < -0.5) trend = "decreasing";

		return { avg, trend, diff: Math.abs(diff) };
	}, [data]);

	// Theming & layout
	const restyleTheme = useTheme();
	const areaColor =
		color ||
		(restyleTheme?.colors?.success as string) ||
		GRADIENT_COLORS.success;
	const LEFT_AXIS_WIDTH = 64;
	const MIN_POINT_SPACING = 28;
	const contentWidthUnclamped = Math.max(
		chartWidth,
		(data && data.length ? data.length : 1) * MIN_POINT_SPACING +
			LEFT_AXIS_WIDTH +
			40
	);
	const contentWidth = Number.isFinite(contentWidthUnclamped)
		? Math.floor(contentWidthUnclamped)
		: chartWidth;

	return (
		<View style={{ marginVertical: 12 }}>
			{title && (
				<View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
					<Text
						style={{
							fontSize: 16,
							fontWeight: "700",
							color: restyleTheme.colors.primaryText,
							letterSpacing: -0.3,
						}}
					>
						{title}
					</Text>
					{stats.avg > 0 && (
						<View
							style={{
								flexDirection: "row",
								marginTop: 4,
								alignItems: "center",
							}}
						>
							<Text
								style={{
									fontSize: 12,
									fontWeight: "500",
									color: "#6B7280",
								}}
							>
								Trend: {stats.avg.toFixed(1)}h avg
							</Text>
							<Text
								style={{
									fontSize: 11,
									fontWeight: "600",
									color:
										stats.trend === "increasing"
											? "#10B981"
											: stats.trend === "decreasing"
											? "#EF4444"
											: "#6B7280",
									marginLeft: 8,
									paddingHorizontal: 8,
									paddingVertical: 2,
									borderRadius: 4,
									backgroundColor:
										stats.trend === "increasing"
											? "#D1FAE5"
											: stats.trend === "decreasing"
											? "#FEE2E2"
											: "#F3F4F6",
								}}
							>
								{stats.trend === "increasing"
									? "↗ improving"
									: stats.trend === "decreasing"
									? "↘ declining"
									: "→ stable"}
							</Text>
						</View>
					)}
				</View>
			)}
			<ChartCard
				dataLength={data.length}
				leftAxisDomainMax={Math.max(maxValue * 1.15, 16)}
				height={height}
			>
				<VictoryChart
					width={contentWidth}
					height={height}
					padding={{
						top: 24,
						bottom: 48,
						left: 8,
						right: 24,
					}}
					theme={modernChartTheme}
					domain={{ y: [0, Math.max(maxValue * 1.15, 16)] }}
					containerComponent={
						interactive ? (
							<VictoryVoronoiContainer
								voronoiDimension="x"
								labels={({ datum }) => `${datum.x}: ${datum.y.toFixed(1)}h`}
								labelComponent={
									<VictoryTooltip
										style={{
											fontSize: 12,
											fill: "#FFFFFF",
											fontWeight: "700",
										}}
										flyoutStyle={{
											fill: "#1F2937",
											stroke: areaColor,
											strokeWidth: 2,
											rx: 8,
										}}
										flyoutPadding={{ top: 8, bottom: 8, left: 14, right: 14 }}
										cornerRadius={8}
									/>
								}
							/>
						) : undefined
					}
				>
					<VictoryAxis
						tickFormat={(tick) => String(tick)}
						style={{
							tickLabels: {
								fontSize: 10,
								angle: -45,
								textAnchor: "end",
								fill: "#6B7280",
							},
						}}
					/>
					{/* dependentAxis intentionally omitted to keep y-axis sticky */}
					<VictoryArea
						data={chartData}
						x="x"
						y="y"
						style={{
							data: {
								fill: areaColor,
								fillOpacity: 0.3,
								stroke: areaColor,
								strokeWidth: 3,
								strokeLinecap: "round",
							},
						}}
						interpolation="natural"
					/>
				</VictoryChart>
			</ChartCard>
		</View>
	);
};

// Optional: Re-export for convenience
export { VictoryChart, VictoryBar, VictoryArea, VictoryAxis };

interface DateRangeSelectorProps {
	selected: DateRangeOption;
	onChange: (option: DateRangeOption) => void;
}

export const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({
	selected,
	onChange,
}) => {
	const theme = useTheme();
	const options: Array<{ label: string; value: DateRangeOption }> = [
		{ label: "7 Days", value: "7d" },
		{ label: "14 Days", value: "14d" },
		{ label: "28 Days", value: "28d" },
		{ label: "90 Days", value: "90d" },
	];

	return (
		<View
			style={{
				flexDirection: "row",
				justifyContent: "space-between",
				marginBottom: 20,
				paddingHorizontal: 16,
				gap: 8,
			}}
		>
			{options.map((option) => (
				<TouchableOpacity
					key={option.value}
					onPress={() => onChange(option.value)}
					style={{
						flex: 1,
						paddingVertical: 10,
						paddingHorizontal: 12,
						borderRadius: 10,
						backgroundColor:
							selected === option.value ? theme.colors.primary : "#F3F4F6",
						alignItems: "center",
						borderWidth: selected === option.value ? 0 : 1.5,
						borderColor: "#E5E7EB",
						shadowColor:
							selected === option.value ? theme.colors.primary : "transparent",
						shadowOpacity: selected === option.value ? 0.2 : 0,
						shadowRadius: selected === option.value ? 8 : 0,
						shadowOffset: { width: 0, height: 2 },
						elevation: selected === option.value ? 3 : 0,
					}}
				>
					<Text
						style={{
							fontSize: 12,
							fontWeight: "700",
							color: selected === option.value ? "#FFFFFF" : "#6B7280",
							letterSpacing: -0.2,
						}}
					>
						{option.label}
					</Text>
				</TouchableOpacity>
			))}
		</View>
	);
};
