import React, { useState, useEffect, useMemo } from "react";
import {
	ScrollView,
	StyleSheet,
} from "react-native";
import { useStore } from "../store/useStore";
import { SleepSession } from "../types";
import { Box, Text, Button } from "../components/ui";
import { AddPastSessionModal } from "../components/AddPastSessionModal";
import * as Haptics from "expo-haptics";
import {
	differenceInSeconds,
	differenceInMinutes,
	format,
	parseISO,
} from "date-fns";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@shopify/restyle";
import { Theme } from "../theme";
import Toast from "react-native-toast-message";
import {
	VALIDATION_CONSTRAINTS,
	VALIDATION_MESSAGES,
} from "../constants/validation";

export const SleepLogScreen = () => {
	const theme = useTheme<Theme>();
	const {
		addSession,
		sessions,
		isTimerRunning,
		currentSessionStartISO,
		startTimer,
		stopTimer,
	} = useStore();

	const [elapsed, setElapsed] = useState(0);
	const [awakeElapsed, setAwakeElapsed] = useState(0);
	const [showManualModal, setShowManualModal] = useState(false);

	// Format durations used in several places (hoisted as a function to avoid use-before-declare errors)
	function formatDuration(seconds: number) {
		const h = Math.floor(seconds / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		const s = seconds % 60;
		return `${h > 0 ? `${h}h ` : ""}${m}m ${s}s`;
	}

	// Sorted sessions latest-first (used by Recent Sessions and other logic)
	const sortedSessions = useMemo(() => {
		return sessions
			.filter((s) => !s.deleted && s.startISO && s.endISO)
			.slice()
			.sort((a, b) => {
				const aTime =
					(a.endISO
						? new Date(a.endISO).getTime()
						: new Date(a.startISO!).getTime()) || 0;
				const bTime =
					(b.endISO
						? new Date(b.endISO).getTime()
						: new Date(b.startISO!).getTime()) || 0;
				return bTime - aTime;
			});
	}, [sessions]);

	// Timer Logic
	useEffect(() => {
		let interval: NodeJS.Timeout;
		if (isTimerRunning && currentSessionStartISO) {
			const start = parseISO(currentSessionStartISO);
			interval = setInterval(() => {
				setElapsed(differenceInSeconds(new Date(), start));
			}, 1000);
		} else {
			setElapsed(0);
		}
		return () => clearInterval(interval);
	}, [isTimerRunning, currentSessionStartISO]);

	// Awake Timer Logic
	useEffect(() => {
		let interval: NodeJS.Timeout;
		if (!isTimerRunning && sessions.length > 0) {
			// Find most recent finished sleep session (latest endISO)
			const finished = sessions.filter((s) => s.endISO && !s.deleted);
			if (finished.length > 0) {
				const latest = finished.slice().sort((a, b) => {
					const aTime = parseISO(a.endISO!).getTime();
					const bTime = parseISO(b.endISO!).getTime();
					return bTime - aTime;
				})[0];
				if (latest && latest.endISO) {
					const end = parseISO(latest.endISO);
					interval = setInterval(() => {
						setAwakeElapsed(differenceInSeconds(new Date(), end));
					}, 1000);
				}
			}
		} else {
			setAwakeElapsed(0);
		}
		return () => clearInterval(interval);
	}, [isTimerRunning, sessions]);

	const handleToggleTimer = async () => {
		await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

		if (isTimerRunning) {
			// Validate minimum sleep duration before stopping
			if (currentSessionStartISO) {
				const durationMinutes = differenceInMinutes(
					new Date(),
					parseISO(currentSessionStartISO)
				);

				if (
					durationMinutes < VALIDATION_CONSTRAINTS.MIN_SLEEP_DURATION_MINUTES
				) {
					Toast.show({
						type: "error",
						text1: "Too Short",
						text2: VALIDATION_MESSAGES.MIN_SLEEP,
						position: "top",
					});
					await Haptics.notificationAsync(
						Haptics.NotificationFeedbackType.Error
					);
					return;
				}
			}

			await stopTimer();
			Toast.show({
				type: "success",
				text1: "Sleep Logged",
				text2: `Recorded ${formatDuration(elapsed)} of sleep`,
				position: "top",
			});
			await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
		} else {
			// Validate minimum wake duration before starting new sleep
			if (sessions.length > 0) {
				const finished = sessions.filter((s) => s.endISO && !s.deleted);
				if (finished.length > 0) {
					const lastSleep = finished.slice().sort((a, b) => {
						const aTime = parseISO(a.endISO!).getTime();
						const bTime = parseISO(b.endISO!).getTime();
						return bTime - aTime;
					})[0];
					if (lastSleep && lastSleep.endISO) {
						const wakeMinutes = differenceInMinutes(
							new Date(),
							parseISO(lastSleep.endISO)
						);

						if (
							wakeMinutes < VALIDATION_CONSTRAINTS.MIN_WAKE_DURATION_MINUTES
						) {
							Toast.show({
								type: "error",
								text1: "Too Soon",
								text2: VALIDATION_MESSAGES.MIN_WAKE,
								position: "top",
							});
							await Haptics.notificationAsync(
								Haptics.NotificationFeedbackType.Error
							);
							return;
						}
					}
				}

				startTimer();
				Toast.show({
					type: "info",
					text1: "Sleep Started",
					text2: "Timer is now running",
					position: "top",
				});
			}
		}
	};

	const handleManualSessionAdd = async (session: SleepSession) => {
		await addSession(session);
	};

	return (
		<Box
			flex={1}
			backgroundColor="mainBackground"
		>
			<ScrollView contentContainerStyle={styles.container}>
				<Text
					variant="header"
					marginBottom="l"
				>
					Sleep Log
				</Text>

				{/* Timer Card */}
				<Box
					backgroundColor={isTimerRunning ? "sleepBedtime" : "cardBackground"}
					padding="xl"
					borderRadius="xl"
					alignItems="center"
					shadowColor="black"
					shadowOpacity={0.1}
					shadowOffset={{ width: 0, height: 4 }}
					shadowRadius={12}
					elevation={5}
					marginBottom="l"
				>
					<Box marginBottom="m">
						<Ionicons
							name={isTimerRunning ? "moon" : "sunny"}
							size={64}
							color={
								isTimerRunning ? theme.colors.white : theme.colors.warning
							}
						/>
					</Box>

					<Text
						variant="header"
						color={isTimerRunning ? "white" : "primaryText"}
						marginBottom="s"
						style={{ fontVariant: ["tabular-nums"] }}
					>
						{isTimerRunning
							? formatDuration(elapsed)
							: formatDuration(awakeElapsed)}
					</Text>

					<Text
						variant="body"
						color={isTimerRunning ? "white" : "secondaryText"}
						marginBottom="l"
					>
						{isTimerRunning ? "Sleeping Soundly" : "Awake & Active"}
					</Text>

					<Button
						onPress={handleToggleTimer}
						style={{
							backgroundColor: isTimerRunning
								? theme.colors.white
								: theme.colors.primary,
							paddingHorizontal: 48,
							paddingVertical: 16,
							borderRadius: 999,
						}}
					>
						<Text
							variant="subtitle"
							color={isTimerRunning ? "primary" : "white"}
							fontWeight="bold"
						>
							{isTimerRunning ? "Wake Up" : "Start Sleep"}
						</Text>
					</Button>
				</Box>

				{/* Manual Entry Button */}
				<Button
					variant="outline"
					onPress={() => setShowManualModal(true)}
					style={{ marginBottom: 24 }}
				>
					<Box
						flexDirection="row"
						alignItems="center"
						justifyContent="center"
					>
						<Ionicons
							name="add-circle-outline"
							size={20}
							color={theme.colors.primary}
							style={{ marginRight: 8 }}
						/>
						<Text
							color="primary"
							fontWeight="600"
						>
							Add Past Session
						</Text>
					</Box>
				</Button>

				{/* Recent Sessions */}
				<Text
					variant="title"
					marginBottom="m"
				>
					Recent Sessions
				</Text>
				{sortedSessions.slice(0, 5).map((s) => (
					<Box
						key={s.id}
						backgroundColor="cardBackground"
						padding="m"
						borderRadius="m"
						marginBottom="s"
						flexDirection="row"
						alignItems="center"
						justifyContent="space-between"
					>
						<Box
							flexDirection="row"
							alignItems="center"
						>
							<Box
								width={40}
								height={40}
								borderRadius="round"
								backgroundColor="primaryLight"
								alignItems="center"
								justifyContent="center"
								marginRight="m"
							>
								<Ionicons
									name="moon"
									size={20}
									color={theme.colors.primary}
								/>
							</Box>
							<Box>
								<Text
									variant="body"
									fontWeight="600"
								>
									{format(parseISO(s.startISO), "h:mm a")} -{" "}
									{s.endISO ? format(parseISO(s.endISO), "h:mm a") : "Now"}
								</Text>
								<Text variant="caption">
									{s.endISO
										? formatDuration(
												differenceInSeconds(
													parseISO(s.endISO),
													parseISO(s.startISO)
												)
										  )
										: "Ongoing"}{" "}
									• {format(parseISO(s.startISO), "MMM d")}
								</Text>
							</Box>
						</Box>
						{s.source === "manual" && (
							<Box
								backgroundColor="gray100"
								paddingHorizontal="s"
								paddingVertical="xs"
								borderRadius="s"
							>
								<Text variant="label">Manual</Text>
							</Box>
						)}
					</Box>
				))}
			</ScrollView>

			{/* Add Past Session Modal */}
			<AddPastSessionModal
				visible={showManualModal}
				onClose={() => setShowManualModal(false)}
				onSessionAdd={handleManualSessionAdd}
			/>
		</Box>
	);
};

const styles = StyleSheet.create({
	container: { padding: 20, paddingTop: 60, paddingBottom: 150 },
});
