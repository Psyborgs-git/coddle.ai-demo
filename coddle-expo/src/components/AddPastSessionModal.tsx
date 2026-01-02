import React, { useState, useCallback, useEffect } from "react";
import {
	Modal,
	Pressable,
	View,
	StyleSheet,
	Platform,
} from "react-native";
import { useTheme } from "@shopify/restyle";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
	differenceInMinutes,
	addDays,
	subHours,
	format,
} from "date-fns";
import Toast from "react-native-toast-message";
import * as Haptics from "expo-haptics";
import { Box, Text, Input } from "./ui";
import { Theme } from "../theme";
import {
	VALIDATION_CONSTRAINTS,
	VALIDATION_MESSAGES,
} from "../constants/validation";
import { SleepSession } from "../types";
import { v4 as uuidv4 } from "uuid";

interface AddPastSessionModalProps {
	visible: boolean;
	onClose: () => void;
	onSessionAdd: (session: SleepSession) => Promise<void>;
}

function formatDuration(seconds: number): string {
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	if (h > 0) {
		return `${h}h ${m}m`;
	}
	return `${m}m`;
}

export const AddPastSessionModal: React.FC<AddPastSessionModalProps> = ({
	visible,
	onClose,
	onSessionAdd,
}) => {
	const theme = useTheme<Theme>();
	
	const [startDate, setStartDate] = useState<Date>(() => subHours(new Date(), 1));
	const [endDate, setEndDate] = useState<Date>(() => new Date());
	const [notes, setNotes] = useState("");
	const [showStartPicker, setShowStartPicker] = useState(false);
	const [showEndPicker, setShowEndPicker] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	const handleClose = useCallback(() => {
		setShowStartPicker(false);
		setShowEndPicker(false);
		setNotes("");
		setStartDate(subHours(new Date(), 1));
		setEndDate(new Date());
		onClose();
	}, [onClose]);

	useEffect(() => {
		if (visible) {
			const now = new Date();
			setStartDate(subHours(now, 1));
			setEndDate(now);
			setNotes("");
			setShowStartPicker(false);
			setShowEndPicker(false);
		}
	}, [visible]);

	const handleStartDateChange = useCallback(
		(_event: any, selectedDate: Date | undefined) => {
			if (selectedDate !== undefined) {
				setStartDate(new Date(selectedDate));
			}
		},
		[]
	);

	const handleEndDateChange = useCallback(
		(_event: any, selectedDate: Date | undefined) => {
			if (selectedDate !== undefined) {
				setEndDate(new Date(selectedDate));
			}
		},
		[]
	);

	const handleSubmit = useCallback(async () => {
		setIsLoading(true);
		try {
			const validStartDate = new Date(startDate);
			const validEndDate = new Date(endDate);

			let effectiveEnd = validEndDate;

			if (validEndDate <= validStartDate) {
				const adjusted = addDays(validEndDate, 1);
				const adjustedDuration = differenceInMinutes(adjusted, validStartDate);

				if (
					adjustedDuration > 0 &&
					adjustedDuration <=
						VALIDATION_CONSTRAINTS.MAX_SLEEP_DURATION_HOURS * 60
				) {
					effectiveEnd = adjusted;
					Toast.show({
						type: "info",
						text1: "Cross-midnight detected",
						text2: "End time assumed to be on the next day",
						position: "top",
					});
				} else {
					Toast.show({
						type: "error",
						text1: "Invalid Time",
						text2: VALIDATION_MESSAGES.START_BEFORE_END,
						position: "top",
					});
					await Haptics.notificationAsync(
						Haptics.NotificationFeedbackType.Error
					);
					setIsLoading(false);
					return;
				}
			}

			const now = new Date();
			if (effectiveEnd > now) {
				Toast.show({
					type: "error",
					text1: "Invalid Time",
					text2: VALIDATION_MESSAGES.FUTURE_DATE,
					position: "top",
				});
				await Haptics.notificationAsync(
					Haptics.NotificationFeedbackType.Error
				);
				setIsLoading(false);
				return;
			}

			const durationMinutes = differenceInMinutes(effectiveEnd, validStartDate);
			if (durationMinutes < VALIDATION_CONSTRAINTS.MIN_SLEEP_DURATION_MINUTES) {
				Toast.show({
					type: "error",
					text1: "Too Short",
					text2: VALIDATION_MESSAGES.MIN_SLEEP,
					position: "top",
				});
				await Haptics.notificationAsync(
					Haptics.NotificationFeedbackType.Error
				);
				setIsLoading(false);
				return;
			}

			if (
				durationMinutes >
				VALIDATION_CONSTRAINTS.MAX_SLEEP_DURATION_HOURS * 60
			) {
				Toast.show({
					type: "error",
					text1: "Too Long",
					text2: VALIDATION_MESSAGES.MAX_SLEEP,
					position: "top",
				});
				await Haptics.notificationAsync(
					Haptics.NotificationFeedbackType.Error
				);
				setIsLoading(false);
				return;
			}

			const session: SleepSession = {
				id: uuidv4(),
				startISO: validStartDate.toISOString(),
				endISO: effectiveEnd.toISOString(),
				source: "manual",
				updatedAtISO: new Date().toISOString(),
				notes: notes.trim() || undefined,
			};

			await onSessionAdd(session);

			Toast.show({
				type: "success",
				text1: "Session Added",
				text2: `Logged ${formatDuration(durationMinutes * 60)} of sleep`,
				position: "top",
			});
			await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

			handleClose();
		} catch (error) {
			console.error("Error adding session:", error);
			Toast.show({
				type: "error",
				text1: "Error",
				text2: "Failed to add session",
				position: "top",
			});
			await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
		} finally {
			setIsLoading(false);
		}
	}, [startDate, endDate, notes, handleClose]);

	return (
		<Modal
			visible={visible}
			transparent
			animationType="slide"
			onRequestClose={handleClose}
		>
			<View style={[styles.overlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
				<Pressable style={styles.backDrop} onPress={handleClose} />
				<View style={[styles.modalContent, { backgroundColor: theme.colors.cardBackground }]}>
					<Text variant="title" marginBottom="m">
						Log Past Sleep
					</Text>

					{/* Start Time Section */}
					<Pressable
						onPress={() => setShowStartPicker(!showStartPicker)}
						style={styles.timeSelector}
					>
						<View style={[styles.timeBox, { backgroundColor: theme.colors.mainBackground }]}>
							<Text variant="caption" color="secondaryText">
								Started
							</Text>
							<Text variant="body" marginTop="s">
								{format(startDate, "EEEE, MMM d · h:mm a")}
							</Text>
						</View>
					</Pressable>

					{showStartPicker && (
						<>
							{Platform.OS === "android" && (
								<Pressable
									onPress={() => setShowStartPicker(false)}
									style={[styles.androidDoneButton, { backgroundColor: theme.colors.primaryLight }]}
								>
									<Text style={[styles.androidDoneText, { color: theme.colors.primary }]}>
										Done selecting start time
									</Text>
								</Pressable>
							)}
							<View style={styles.pickerContainer}>
								<DateTimePicker
									value={startDate}
									mode="datetime"
									display={Platform.OS === "ios" ? "spinner" : "default"}
									onChange={handleStartDateChange}
									maximumDate={new Date()}
									timeZoneOffsetInMinutes={-new Date().getTimezoneOffset()}
									textColor={theme.colors.primaryText}
								/>
							</View>
						</>
					)}

					{/* End Time Section */}
					<Pressable
						onPress={() => setShowEndPicker(!showEndPicker)}
						style={styles.timeSelector}
					>
						<View style={[styles.timeBox, { backgroundColor: theme.colors.mainBackground }]}>
							<Text variant="caption" color="secondaryText">
								Ended
							</Text>
							<Text variant="body" marginTop="s">
								{format(endDate, "EEEE, MMM d · h:mm a")}
							</Text>
						</View>
					</Pressable>

					{showEndPicker && (
						<>
							{Platform.OS === "android" && (
								<Pressable
									onPress={() => setShowEndPicker(false)}
									style={[styles.androidDoneButton, { backgroundColor: theme.colors.primaryLight }]}
								>
									<Text style={[styles.androidDoneText, { color: theme.colors.primary }]}>
										Done selecting end time
									</Text>
								</Pressable>
							)}
							<View style={styles.pickerContainer}>
								<DateTimePicker
									value={endDate}
									mode="datetime"
									display={Platform.OS === "ios" ? "spinner" : "default"}
									onChange={handleEndDateChange}
									maximumDate={new Date()}
									timeZoneOffsetInMinutes={-new Date().getTimezoneOffset()}
									textColor={theme.colors.primaryText}
								/>
							</View>
						</>
					)}

					{/* Notes Section */}
					<Input
						label="Notes (Optional)"
						placeholder="Add any notes about this session..."
						value={notes}
						onChangeText={setNotes}
						multiline
						numberOfLines={4}
						maxLength={500}
					/>

					{/* Duration Display */}
					<View style={[styles.durationBox, { 
						backgroundColor: `${theme.colors.success}15`,
						borderColor: `${theme.colors.success}4d`,
					}]}>
						<Text variant="caption" color="success">
							Duration
						</Text>
						<Text variant="body" color="success" marginTop="s">
							{formatDuration(
								differenceInMinutes(
									endDate > startDate ? endDate : addDays(endDate, 1),
									startDate
								) * 60
							)}
						</Text>
					</View>

					{/* Action Buttons */}
					<View style={styles.buttonRow}>
						<Pressable
							style={[styles.button, styles.cancelButton, { backgroundColor: theme.colors.border }]}
							onPress={handleClose}
							disabled={isLoading}
						>
							<Text style={[styles.cancelButtonText, { color: theme.colors.primaryText }]}>Cancel</Text>
						</Pressable>
						<Pressable
							style={[
								styles.button,
								styles.submitButton,
								{ backgroundColor: isLoading ? theme.colors.border : theme.colors.success },
							]}
							onPress={handleSubmit}
							disabled={isLoading}
						>
							<Text style={styles.submitButtonText}>
								{isLoading ? "Saving..." : "Save"}
							</Text>
						</Pressable>
					</View>
				</View>
			</View>
		</Modal>
	);
};

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
	},
	backDrop: {
		flex: 1,
	},
	modalContent: {
		borderTopLeftRadius: 16,
		borderTopRightRadius: 16,
		padding: 24,
		paddingBottom: 32,
		maxHeight: "90%",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.25,
		shadowRadius: 3.84,
		elevation: 5,
	},
	timeSelector: {
		marginBottom: 16,
	},
	timeBox: {
		borderRadius: 12,
		padding: 16,
	},
	androidDoneButton: {
		padding: 12,
		marginBottom: 8,
		borderRadius: 8,
		alignItems: "center",
	},
	androidDoneText: {
		fontSize: 14,
		fontWeight: "500",
	},
	pickerContainer: {
		marginBottom: 24,
	},
	durationBox: {
		borderRadius: 12,
		padding: 16,
		marginBottom: 24,
		borderWidth: 1,
	},
	buttonRow: {
		flexDirection: "row",
		gap: 16,
	},
	button: {
		flex: 1,
		paddingVertical: 12,
		borderRadius: 8,
		alignItems: "center",
	},
	cancelButton: {
	},
	cancelButtonText: {
		fontSize: 16,
		fontWeight: "600",
	},
	submitButton: {
	},
	submitButtonDisabled: {
	},
	submitButtonText: {
		fontSize: 16,
		fontWeight: "600",
		color: "#fff",
	},
});
