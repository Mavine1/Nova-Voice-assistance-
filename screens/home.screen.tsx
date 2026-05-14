import {
  Alert,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { scale, verticalScale } from "react-native-size-matters";
import AntDesign from "@expo/vector-icons/AntDesign";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Audio } from "expo-av";
import axios from "axios";
import LottieView from "lottie-react-native";
import * as Speech from "expo-speech";
import Regenerate from "@/assets/svgs/regenerate";
import Reload from "@/assets/svgs/reload";
import { useAuth } from "@/contexts/AuthContext";

export default function HomeScreen() {
  const { logout, user } = useAuth();
  const [text, setText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording>();
  const [AIResponse, setAIResponse] = useState(false);
  const [AISpeaking, setAISpeaking] = useState(false);
  const lottieRef = useRef<LottieView>(null);

  // get microphone permission
  const getMicrophonePermission = async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();

      if (!granted) {
        Alert.alert(
          "Permission",
          "Please grant permission to access microphone"
        );
        return false;
      }
      return true;
    } catch (error) {
      console.log(error);
      return false;
    }
  };

  const recordingOptions: any = {
    android: {
      extension: ".wav",
      outPutFormat: Audio.AndroidOutputFormat.MPEG_4,
      androidEncoder: Audio.AndroidAudioEncoder.AAC,
      sampleRate: 44100,
      numberOfChannels: 2,
      bitRate: 128000,
    },
    ios: {
      extension: ".wav",
      audioQuality: Audio.IOSAudioQuality.HIGH,
      sampleRate: 44100,
      numberOfChannels: 2,
      bitRate: 128000,
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
    },
    web: {
      mimeType: "audio/webm",
      bitsPerSecond: 128000,
    },
  };

  const startRecording = async () => {
    // Web platform doesn't support expo-av recording, show a message
    if (Platform.OS === "web") {
      Alert.alert(
        "Web Recording",
        "Voice recording is not supported in web browser. Please use the mobile app for voice features, or type a message below."
      );
      return;
    }

    const hasPermission = await getMicrophonePermission();
    if (!hasPermission) return;
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      setIsRecording(true);
      const { recording } = await Audio.Recording.createAsync(recordingOptions);
      setRecording(recording);
    } catch (error) {
      console.log("Failed to start Recording", error);
      Alert.alert("Error", "Failed to start recording. Please try again.");
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      setIsRecording(false);
      setLoading(true);
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      const uri = recording.getURI();

      // send audio to whisper API for transcription
      const transcript = await sendAudioToWhisper(uri!);

      setText(transcript);

      // send the transcript to gpt-4 API for response
      await sendToGpt(transcript);
    } catch (error) {
      console.log("Failed to stop Recording", error);
      Alert.alert("Error", "Failed to stop recording");
    }
  };

  const sendAudioToWhisper = async (uri: string) => {
    try {
      const formData: any = new FormData();
      formData.append("file", {
        uri,
        type: "audio/wav",
        name: "recording.wav",
      });
      formData.append("model", "whisper-1");

      const response = await axios.post(
        "https://api.openai.com/v1/audio/transcriptions",
        formData,
        {
          headers: {
            Authorization: `Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return response.data.text;
    } catch (error) {
      console.log(error);
      return "Could not transcribe audio. Please try again.";
    }
  };

  // send text to gpt4 API
  const sendToGpt = async (inputText: string) => {
    try {
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content:
                "You are Nova, a friendly AI assistant. You are helpful, concise, and respond naturally. Provide clear and helpful answers.",
            },
            {
              role: "user",
              content: inputText,
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );
      setText(response.data.choices[0].message.content);
      setLoading(false);
      setAIResponse(true);
      await speakText(response.data.choices[0].message.content);
      return response.data.choices[0].message.content;
    } catch (error) {
      console.log("Error sending text to GPT-4", error);
      setLoading(false);
      setAIResponse(true);
      setText("I'm having trouble connecting to the AI service. Please check your internet connection and try again.");
    }
  };

  const speakText = async (textToSpeak: string) => {
    setAISpeaking(true);
    const options = {
      voice: "com.apple.ttsbundle.Samantha-compact",
      language: "en-US",
      pitch: 1.5,
      rate: 1,
      onDone: () => {
        setAISpeaking(false);
      },
    };
    Speech.speak(textToSpeak, options);
  };

  useEffect(() => {
    if (AISpeaking) {
      lottieRef.current?.play();
    } else {
      lottieRef.current?.reset();
    }
  }, [AISpeaking]);

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => {
        await logout();
      }},
    ]);
  };

  return (
    <LinearGradient
      colors={["#250152", "#000"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <StatusBar barStyle={"light-content"} />

      {/* back shadows */}
      <Image
        source={require("../assets/main/blur.png")}
        style={{
          position: "absolute",
          right: scale(-15),
          top: 0,
          width: scale(240),
        }}
      />
      <Image
        source={require("../assets/main/purple-blur.png")}
        style={{
          position: "absolute",
          left: scale(-15),
          bottom: verticalScale(100),
          width: scale(210),
        }}
      />

      {/* User Info Header */}
      <View style={styles.userHeader}>
        {AIResponse && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              setIsRecording(false);
              setAIResponse(false);
              setText("");
            }}
          >
            <AntDesign name="arrowleft" size={scale(20)} color="#fff" />
          </TouchableOpacity>
        )}

        <View style={styles.userInfo}>
          <View style={styles.userAvatar}>
            <FontAwesome name="user" size={scale(18)} color="#fff" />
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userGreeting}>Hello!</Text>
            <Text style={styles.userEmail}>{user?.email || 'User'}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <AntDesign name="logout" size={scale(20)} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={{ marginTop: verticalScale(20) }}>
        {loading ? (
          <TouchableOpacity>
            <LottieView
              source={require("../assets/animations/loading.json")}
              autoPlay
              loop
              speed={1.3}
              style={{ width: scale(270), height: scale(270) }}
            />
          </TouchableOpacity>
        ) : (
          <>
            {!isRecording ? (
              <>
                {AIResponse ? (
                  <View>
                    <LottieView
                      ref={lottieRef}
                      source={require("../assets/animations/ai-speaking.json")}
                      autoPlay={false}
                      loop={false}
                      style={{ width: scale(250), height: scale(250) }}
                    />
                  </View>
                ) : (
                  <TouchableOpacity
                    style={{
                      width: scale(110),
                      height: scale(110),
                      backgroundColor: "#fff",
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: scale(100),
                    }}
                    onPress={startRecording}
                  >
                    <FontAwesome
                      name="microphone"
                      size={scale(50)}
                      color="#2b3356"
                    />
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <TouchableOpacity onPress={stopRecording}>
                <LottieView
                  source={require("../assets/animations/animation.json")}
                  autoPlay
                  loop
                  speed={1.3}
                  style={{ width: scale(250), height: scale(250) }}
                />
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      {/* Status Text */}
      <View
        style={{
          alignItems: "center",
          width: scale(350),
          position: "absolute",
          bottom: verticalScale(90),
        }}
      >
        <Text
          style={{
            color: "#fff",
            fontSize: scale(16),
            width: scale(269),
            textAlign: "center",
            lineHeight: 25,
          }}
        >
          {loading
            ? "Processing your request..."
            : text || (isRecording
              ? "Listening... Tap to stop"
              : "Tap the microphone to start recording!")}
        </Text>
      </View>

      {/* Action Buttons */}
      {AIResponse && (
        <View
          style={{
            position: "absolute",
            bottom: verticalScale(40),
            left: 0,
            paddingHorizontal: scale(30),
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            width: scale(360),
          }}
        >
          <TouchableOpacity onPress={() => sendToGpt(text)}>
            <Regenerate />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => speakText(text)}>
            <Reload />
          </TouchableOpacity>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#131313",
  },
  userHeader: {
    position: "absolute",
    top: verticalScale(50),
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scale(20),
    zIndex: 10,
  },
  backButton: {
    padding: scale(8),
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  userAvatar: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: scale(10),
  },
  userDetails: {
    alignItems: "flex-start",
  },
  userGreeting: {
    color: "#fff",
    fontSize: scale(14),
    fontWeight: "500",
  },
  userEmail: {
    color: "rgba(255,255,255,0.7)",
    fontSize: scale(12),
  },
  logoutButton: {
    padding: scale(8),
  },
});