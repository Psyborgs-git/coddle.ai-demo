import React, { useState, useCallback, useEffect } from "react";
import {
	Modal,
	Pressable,
	StyleSheet,
	TextInput,
} from "react-native";
import { useTheme } from "@shopify/restyle";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import Toast from "react-native-toast-message";
import * as Haptics from "expo-haptics";
import { Box, Text } from "./ui";
import { Theme } from "../theme";
import { v4 as uuidv4 } from "uuid";
import { NotificationService } from "../services/notifications";

interface NotificationSchedulerModalProps {
	visible: boolean;
	onClose: () => void;
	onNotificationScheduled?: (success: boolean) => void;
}

export const NotificationSchedulerModal: React.FC<
	NotificationSchedulerModalProps
> = ({ visible, onClose, onNotificationScheduled }) => {
	const theme = useTheme<Theme>();

	// Notification state
	const [notifTitle, setNotifTitle] = useState("");
	const [notifBody, setNotifBody] = useState("");
	const [notifDate, setNotifDate] = useState<Date>(new Date());
	const [showDatePicker, setShowDatePicker] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	// Initialize defaults when modal opens
	const handleModalOpen = useCallback(() => {
		const now = new Date();
		// Set default to 1 hour from now
		const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
		setNotifTitle("");
		setNotifBody("");
		setNotifDate(oneHourLater);
		setShowDatePicker(false);
	}, []);

	useEffect(() => {
		if (visible) {
			handleModalOpen();
		}
	}, [visible, handleModalOpen]);

	const handleClose = useCallback(() => {
		setShowDatePicker(false);
		onClose();
	}, [onClose]);

	const handleSave = useCallback(async () => {
		if (!notifTitle.trim()) {
			Toast.show({
				type: "error",
				text1: "Error",
				text2: "Please enter a title",
				position: "top",
			});
			await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
			return;
		}

		if (notifDate <= new Date()) {
			Toast.show({
				type: "error",
				text1: "Invalid Time",
				text2: "Please select a future time",
				position: "top",
			});
			await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
			return;
		}

		setIsLoading(true);
		try {
			const result: any = await NotificationService.scheduleNotification({
				title: notifTitle.trim(),
				body: notifBody.trim() || "Reminder",
				scheduledForISO: notifDate.toISOString(),
				scheduleBlockId: "manual-" + uuidv4(),
			});

			if (!result || result.success === false) {
				Toast.show({
					type: "error",
					text1: "Error",
					text2: "Failed to schedule notification",
					position: "top",
				});
				await Haptics.notificationAsync(
					Haptics.NotificationFeedbackType.Error
				);
				onNotificationScheduled?.(false);
				return;
			}

			Toast.show({
				type: "success",
				text1: "Notification Scheduled",
				text2: `Reminder set for ${notifDate.toLocaleString()}`,
				position: "top",
			});

			await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
			onNotificationScheduled?.(true);
			handleClose();
		} catch (error) {
			console.error("Error scheduling notification:", error);
			Toast.show({
				type: "error",
				text1: "Error",
				text2: "Failed to schedule notification",
				position: "top",
			});
			await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
			onNotificationScheduled?.(false);
		} finally {
			setIsLoading(false);
		}
	}, [notifTitle, notifBody, notifDate, handleClose, onNotificationScheduled]);

	return (
		<Modal
			visible={visible}
			animationType="slide"
			presentationStyle="pageSheet"
			onRequestClose={handleClose}
		>
			<Box
				flex={1}
				backgroundColor="mainBackground"
				padding="l"
				style={{ paddingTop: 20 }}
			>
				{/* Header */}
				<Box
					flexDirection="row"
					justifyContent="space-between"
					alignItems="center"
					marginBottom="xl"
				>
					<Pressable onPress={handleClose} disabled={isLoading}>
						<Text variant="body" color="primary">
							Cancel
						</Text>
					</Pressable>
					<Text variant="subtitle">Add Reminder</Text>
					<Pressable onPress={handleSave} disabled={isLoading}>
						<Text
							variant="body"
							color={isLoading ? "secondaryText" : "primary"}
							fontWeight="600"
						>
							{isLoading ? "Saving..." : "Save"}
						</Text>
					</Pressable>
				</Box>

				{/* Title Input */}
				<Text variant="body" marginBottom="s">
					Title
				</Text>
				<Box backgroundColor="cardBackground" borderRadius="m" marginBottom="l">
					<TextInput
						value={notifTitle}
						onChangeText={setNotifTitle}
						placeholder="e.g. Give Medicine"
						placeholderTextColor={theme.colors.secondaryText}
						style={{
							padding: 16,
							fontSize: 16,
							color: theme.colors.primaryText,
						}}
						autoFocus
						editable={!isLoading}
					/>
				</Box>

				{/* Message Input */}
				<Text variant="body" marginBottom="s">
					Message (Optional)
				</Text>
				<Box backgroundColor="cardBackground" borderRadius="m" marginBottom="l">
					<TextInput
						value={notifBody}
						onChangeText={setNotifBody}
						placeholder="Details..."
						placeholderTextColor={theme.colors.secondaryText}
						style={{
							padding: 16,
							fontSize: 16,
							color: theme.colors.primaryText,
						}}
						multiline
						numberOfLines={2}
						editable={!isLoading}
					/>
				</Box>

				{/* Date/Time Picker */}
				<Text variant="body" marginBottom="s">
					Time
				</Text>
				<Box
					backgroundColor="cardBackground"
					borderRadius="m"
					overflow="hidden"
					marginBottom="l"
				>
					<DateTimePicker
						value={notifDate}
						mode="datetime"
						display="spinner"
						minimumDate={new Date()}
						onChange={(e, date) => date && setNotifDate(date)}
						textColor={theme.colors.primaryText}
					/>
				</Box>

				{/* Help text */}
				<Text variant="caption" color="secondaryText" marginTop="m">
					Reminder will be sent at the selected time
				</Text>
			</Box>
		</Modal>
	);
};

const styles = StyleSheet.create({});
