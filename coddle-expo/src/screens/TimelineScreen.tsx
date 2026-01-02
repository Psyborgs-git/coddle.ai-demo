import React, { useState, useMemo } from "react";
import { ScrollView, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStore } from "../store/useStore";
import { format, subDays, startOfDay, isAfter } from "date-fns";
import { safeParseISO } from "../utils/date";
import {
	Box,
	Text,
	SimpleBarChart,
	DateRangeSelector,
	AreaChart,
} from "../components/ui";
import type { DateRangeOption } from "../components/ui";
import { SessionCard } from "../components/ui/SessionCard";
import { CoachWidget } from "../components/CoachWidget";
import Toast from "react-native-toast-message";

export const TimelineScreen = () => {
	const insets = useSafeAreaInsets();
	const sessions = useStore((state) => state.sessions);
	const deleteSession = useStore((state) => state.deleteSession);
	const [dateRange, setDateRange] = useState<DateRangeOption>("7d");

	// Get date range in days
	const getRangeDays = (range: DateRangeOption): number => {
		switch (range) {
			case "7d":
				return 7;
			case "14d":
				return 14;
			case "28d":
				return 28;
			case "90d":
				return 90;
			default:
				return 7;
		}
	};

	// Compute chart data based on selected date range
	const { barChartData, lineChartData, stats } = useMemo(() => {
		const days = getRangeDays(dateRange);
		// Set cutoff to exactly N days ago at start of day
		const cutoffDate = subDays(new Date(), days - 1); // -1 to include today + N-1 previous days

		// Filter sessions within range
		const filteredSessions = sessions.filter((session) => {
			if (session.deleted || !session.startISO || !session.endISO) return false;
			const start = safeParseISO(session.startISO);
			return (
				(start && isAfter(start, cutoffDate)) ||
				start?.getTime() === cutoffDate.getTime()
			);
		});

		// Group sessions by day
		const sessionsByDay = filteredSessions.reduce((acc, session) => {
			const start = safeParseISO(session.startISO!);
			const end = safeParseISO(session.endISO!);
			if (!start || !end) return acc;

			const day = format(start, "yyyy-MM-dd");
			const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60); // hours
			acc[day] = (acc[day] || 0) + duration;
			return acc;
		}, {} as Record<string, number>);

		// Create bar chart data with x, y format
		const barData = Object.entries(sessionsByDay)
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([day, hours]) => ({
				x: format(safeParseISO(day) || new Date(), days > 14 ? "M/d" : "MM/dd"),
				y: parseFloat(hours.toFixed(1)),
			}));

		// Create line chart data (same format)
		const lineData = barData.map((d) => ({ x: d.x, y: d.y }));

		// Calculate stats
		const values = barData.map((d) => d.y);
		const totalHours = values.reduce((a, b) => a + b, 0);
		const avgHours = values.length > 0 ? totalHours / values.length : 0;
		const maxHours = values.length > 0 ? Math.max(...values) : 0;

		return {
			barChartData: barData,
			lineChartData: lineData,
			stats: {
				total: totalHours,
				average: avgHours,
				max: maxHours,
				daysLogged: values.length,
			},
		};
	}, [sessions, dateRange]);

	const handleDelete = (id: string) => {
		Alert.alert(
			"Delete Session",
			"Are you sure you want to delete this session?",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Delete",
					style: "destructive",
					onPress: async () => {
						await deleteSession(id);
						Toast.show({
							type: "success",
							text1: "Session Deleted",
							text2: "Sleep session removed successfully",
						});
					},
				},
			]
		);
	};

	const coachTips = useStore((state) => state.coachTips);

	const handleTipTap = (tip: any) => {
		Alert.alert(tip.title, tip.message);
	};

	return (
		<Box
			flex={1}
			backgroundColor="mainBackground"
		>
			<ScrollView showsVerticalScrollIndicator={false}>
				<Box
					padding="l"
					style={{
						paddingTop: insets.top + 16,
						paddingBottom: insets.bottom + 120,
					}}
				>
					<Box>
						<Text
							variant="header"
							marginBottom="l"
						>
							Timeline & Trends
						</Text>
					</Box>

					{/* Coach Widget */}
					<CoachWidget
						tips={coachTips}
						onTapTip={handleTipTap}
					/>

					{/* Date Range Selector */}
					<DateRangeSelector
						selected={dateRange}
						onChange={setDateRange}
					/>

					{/* Stats Overview */}
					<Box
						flexDirection="row"
						justifyContent="space-between"
						marginBottom="m"
					>
						<Box
							flex={1}
							backgroundColor="cardBackground"
							borderRadius="m"
							padding="m"
							marginRight="s"
							alignItems="center"
						>
							<Text
								variant="body"
								color="secondaryText"
								fontSize={11}
							>
								Days Logged
							</Text>
							<Text
								variant="subtitle"
								fontSize={18}
							>
								{stats.daysLogged}
							</Text>
						</Box>
						<Box
							flex={1}
							backgroundColor="cardBackground"
							borderRadius="m"
							padding="m"
							marginHorizontal="s"
							alignItems="center"
						>
							<Text
								variant="body"
								color="secondaryText"
								fontSize={11}
							>
								Avg/Day
							</Text>
							<Text
								variant="subtitle"
								fontSize={18}
							>
								{stats.average.toFixed(1)}h
							</Text>
						</Box>
						<Box
							flex={1}
							backgroundColor="cardBackground"
							borderRadius="m"
							padding="m"
							marginLeft="s"
							alignItems="center"
						>
							<Text
								variant="body"
								color="secondaryText"
								fontSize={11}
							>
								Total
							</Text>
							<Text
								variant="subtitle"
								fontSize={18}
							>
								{stats.total.toFixed(1)}h
							</Text>
						</Box>
					</Box>

					{/* Bar Chart */}
					<Box
						backgroundColor="cardBackground"
						borderRadius="l"
						marginBottom="l"
						shadowColor="black"
						shadowOpacity={0.1}
						shadowRadius={12}
						shadowOffset={{ width: 0, height: 4 }}
					>
						{barChartData.length > 0 ? (
							<SimpleBarChart
								data={barChartData}
								title="Daily Sleep Hours"
								yAxisLabel="Hours"
								height={280}
								color="#6366F1"
							/>
						) : (
							<Box
								padding="xl"
								alignItems="center"
							>
								<Text
									variant="body"
									color="secondaryText"
									textAlign="center"
								>
									No data for this period.
								</Text>
							</Box>
						)}
					</Box>

					{/* Trend Area Chart */}
					{lineChartData.length > 1 && (
						<Box
							backgroundColor="cardBackground"
							borderRadius="l"
							marginBottom="l"
							shadowColor="black"
							shadowOpacity={0.1}
							shadowRadius={12}
							shadowOffset={{ width: 0, height: 4 }}
						>
							<AreaChart
								data={lineChartData}
								title="Sleep Trend Over Time"
								yAxisLabel="Hours"
								height={280}
								color="#8B5CF6"
							/>
						</Box>
					)}

					<Text
						variant="subtitle"
						marginBottom="m"
					>
						All Sessions
					</Text>
					{sessions.filter((s) => !s.deleted && s.startISO && s.endISO).length >
					0 ? (
						sessions
							.filter((s) => !s.deleted && s.startISO && s.endISO)
							.slice()
							.sort((a, b) => {
						const aTime = (a.endISO ? new Date(a.endISO).getTime() : new Date(a.startISO!).getTime()) || 0;
						const bTime = (b.endISO ? new Date(b.endISO).getTime() : new Date(b.startISO!).getTime()) || 0;
						return bTime - aTime; // latest-first
					})
							.map((session) => (
								<SessionCard
									key={session.id}
									session={session}
									onLongPress={() => handleDelete(session.id)}
								/>
							))
					) : (
						<Box
							backgroundColor="cardBackground"
							borderRadius="l"
							padding="xl"
							alignItems="center"
						>
							<Text
								variant="body"
								color="secondaryText"
								textAlign="center"
							>
								No sleep sessions logged yet.
								{"\n"}Go to the Log tab to start tracking!
							</Text>
						</Box>
					)}
				</Box>
			</ScrollView>
		</Box>
	);
};
