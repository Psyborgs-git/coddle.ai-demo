import React, { useState, useCallback, useEffect } from "react";
import {
	Modal,
	Pressable,
	StyleSheet,
	TextInput,
	Platform,
	UIManager,
} from "react-native";
import { useTheme } from "@shopify/restyle";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { format, parseISO, differenceInMonths } from "date-fns";
import Toast from "react-native-toast-message";
import * as Haptics from "expo-haptics";
import { Box, Text } from "./ui";
import { Theme } from "../theme";
import { BabyProfile } from "../types";
import { PROFILE_COLORS } from "../store/useStore";

interface ProfileModalProps {
	visible: boolean;
	onClose: () => void;
	onSave: (profile: BabyProfile) => Promise<void>;
	editingProfile?: BabyProfile | null;
	existingProfilesCount: number;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
	visible,
	onClose,
	onSave,
	editingProfile,
	existingProfilesCount,
}) => {
	const theme = useTheme<Theme>();

	// Profile state
	const [name, setName] = useState("");
	const [birthDate, setBirthDate] = useState<Date | null>(null);
	const [selectedColor, setSelectedColor] = useState(PROFILE_COLORS[0]);
	const [showDatePicker, setShowDatePicker] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	// Initialize defaults when modal opens
	const handleModalOpen = useCallback(() => {
		if (editingProfile) {
			setName(editingProfile.name);
			setBirthDate(
				editingProfile.birthDateISO ? parseISO(editingProfile.birthDateISO) : null
			);
			setSelectedColor(editingProfile.avatarColor || PROFILE_COLORS[0]);
		} else {
			setName("");
			setBirthDate(null);
			setSelectedColor(PROFILE_COLORS[existingProfilesCount % PROFILE_COLORS.length]);
		}
		setShowDatePicker(false);
	}, [editingProfile, existingProfilesCount]);

	useEffect(() => {
		if (visible) {
			handleModalOpen();
		}
	}, [visible, handleModalOpen]);

	const handleClose = useCallback(() => {
		setShowDatePicker(false);
		onClose();
	}, [onClose]);

	const getAgeString = (birthISO: string) => {
		const months = differenceInMonths(new Date(), parseISO(birthISO));
		if (months < 1) return "Newborn";
		if (months === 1) return "1 month";
		if (months < 12) return `${months} months`;
		const years = Math.floor(months / 12);
		const remainingMonths = months % 12;
		if (remainingMonths === 0) return `${years} year${years > 1 ? "s" : ""}`;
		return `${years}y ${remainingMonths}m`;
	};

	const handleSave = useCallback(async () => {
		if (!name.trim()) {
			Toast.show({
				type: "error",
				text1: "Error",
				text2: "Please enter a name",
				position: "top",
			});
			return;
		}
		if (!birthDate) {
			Toast.show({
				type: "error",
				text1: "Error",
				text2: "Please select a birth date",
				position: "top",
			});
			return;
		}

		setIsLoading(true);
		try {
			const profile: BabyProfile = {
				...(editingProfile || { id: "", createdAtISO: new Date().toISOString() }),
				name: name.trim(),
				birthDateISO: birthDate.toISOString(),
				avatarColor: selectedColor,
			};

			await onSave(profile);

			Toast.show({
				type: "success",
				text1: editingProfile ? "Profile Updated" : "Profile Created",
				text2: `${name.trim()}${
					editingProfile ? "'s profile has been updated" : " has been added"
				}`,
				position: "top",
			});

			await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
			handleClose();
		} catch (error) {
			console.error("Error saving profile:", error);
			Toast.show({
				type: "error",
				text1: "Error",
				text2: "Failed to save profile",
				position: "top",
			});
			await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
		} finally {
			setIsLoading(false);
		}
	}, [name, birthDate, selectedColor, editingProfile, onSave, handleClose]);

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
					<Pressable onPress={handleClose}>
						<Text variant="body" color="primary">
							Cancel
						</Text>
					</Pressable>
					<Text variant="subtitle">
						{editingProfile ? "Edit Profile" : "New Profile"}
					</Text>
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

				{/* Color Picker */}
				<Text variant="body" marginBottom="s">
					Avatar Color
				</Text>
				<Box flexDirection="row" flexWrap="wrap" marginBottom="l">
					{PROFILE_COLORS.map((color) => (
						<Pressable
							key={color}
							onPress={() => {
								setSelectedColor(color);
								Haptics.selectionAsync();
							}}
						>
							<Box
								width={44}
								height={44}
								borderRadius="round"
								margin="xs"
								alignItems="center"
								justifyContent="center"
								style={{ backgroundColor: color }}
								borderWidth={selectedColor === color ? 3 : 0}
								borderColor="mainBackground"
							>
								{selectedColor === color && (
									<Ionicons name="checkmark" size={24} color="white" />
								)}
							</Box>
						</Pressable>
					))}
				</Box>

				{/* Name Input */}
				<Text variant="body" marginBottom="s">
					Baby Name
				</Text>
				<Box
					backgroundColor="cardBackground"
					borderRadius="m"
					marginBottom="l"
				>
					<TextInput
						value={name}
						onChangeText={setName}
						placeholder="Enter name"
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

				{/* Birth Date Picker */}
				<Text variant="body" marginBottom="s">
					Birth Date
				</Text>
				<Pressable
					onPress={() => setShowDatePicker(!showDatePicker)}
					disabled={isLoading}
				>
					<Box
						backgroundColor="cardBackground"
						borderRadius="m"
						padding="m"
						flexDirection="row"
						alignItems="center"
						justifyContent="space-between"
						opacity={isLoading ? 0.5 : 1}
					>
						<Text
							variant="body"
							color={birthDate ? "primaryText" : "secondaryText"}
						>
							{birthDate
								? format(birthDate, "MMMM d, yyyy")
								: "Select birth date"}
						</Text>
						<Ionicons
							name="calendar-outline"
							size={20}
							color={theme.colors.secondaryText}
						/>
					</Box>
				</Pressable>

				{showDatePicker && (
					<Box
						marginVertical="m"
						backgroundColor="cardBackground"
						borderRadius="m"
						paddingVertical="m"
						overflow="hidden"
					>
						<DateTimePicker
							value={birthDate || new Date()}
							mode="date"
							display="spinner"
							maximumDate={new Date()}
							textColor={theme.colors.primaryText}
							onBlur={() => setShowDatePicker(false)}
							onChange={(e, date) => {
								setShowDatePicker(Platform.OS === "ios");
								if (date) setBirthDate(date);
							}}
						/>
						{Platform.OS === "android" && (
							<Box
								flexDirection="row"
								justifyContent="flex-end"
								paddingHorizontal="m"
								paddingBottom="s"
							>
								<Pressable
									onPress={() => setShowDatePicker(false)}
									style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
								>
									<Text
										variant="body"
										color="primary"
										fontWeight="600"
									>
										Done
									</Text>
								</Pressable>
							</Box>
						)}
					</Box>
				)}

				{/* Preview */}
				{name && (
					<Box
						alignItems="center"
						marginTop="xl"
						marginBottom="l"
						paddingBottom="xl"
					>
						<Box
							width={100}
							height={100}
							borderRadius="round"
							alignItems="center"
							justifyContent="center"
							style={{
								backgroundColor: selectedColor,
								shadowColor: selectedColor,
								shadowOpacity: 0.3,
								shadowOffset: { width: 0, height: 4 },
								shadowRadius: 8,
								elevation: 4,
							}}
						>
							<Text
								style={{ color: "white" }}
								variant="title"
								fontVariant={["common-ligatures"]}
								fontSize={48}
								fontWeight="bold"
								lineHeight={60}
							>
								{name.charAt(0).toUpperCase()}
							</Text>
						</Box>
						<Text variant="subtitle" marginTop="s" textAlign="center">
							{name}
						</Text>
						{birthDate && (
							<Text variant="caption" color="secondaryText" marginTop="xs">
								{getAgeString(birthDate.toISOString())}
							</Text>
						)}
					</Box>
				)}
			</Box>
		</Modal>
	);
};

const styles = StyleSheet.create({});
