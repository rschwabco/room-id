import { Camera, CameraType } from "expo-camera";
import { useState, useEffect, useRef } from "react";
import {
  Button,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
} from "react-native";
import io from "socket.io-client";
import { manipulateAsync, FlipType, SaveFormat } from "expo-image-manipulator";
import IconButton from "./components/IconButton";
import { Switch } from "@rneui/themed";
import { TaskTimer } from "tasktimer";

export default function App() {
  const [type, setType] = useState(CameraType.back);
  const [permission, requestPermission] = Camera.useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [hasConnection, setConnection] = useState(false);
  const [detectedLabel, setDetectedLabel] = useState(null);
  const ENDPOINT = "http://192.168.0.6:8080";
  const interval = 2000;
  const [label, setLabel] = useState(null);
  const [training, setTraining] = useState(false);
  const [intervalId, setIntervalID] = useState(0);

  let socket = useRef(null);
  const cameraRef = useRef(null);

  useEffect(
    function didMount() {
      socket.current = io(ENDPOINT, {
        transports: ["websocket"],
      });

      socket.current.on("connect", () => {
        console.log("connected");
        setConnection(true);
      });

      socket.current.on("detectedLabel", (label) => {
        setDetectedLabel(label);
      });

      socket.current.io.on("close", () => setConnection(false));

      socket.current.on("disconnect", () => {
        setConnection(false);
      });

      return function didUnmount() {
        socket.current.disconnect();
        socket.current.removeAllListeners();
      };
    },
    [ENDPOINT]
  );

  useEffect(() => {
    console.log("intervalId", intervalId);
    if (!cameraReady) {
      console.log("camera not ready");
      return;
    } else {
      console.log("camera ready", recording, intervalId);
      if (recording && !intervalId) {
        console.log("started", recording, intervalId);
        setIntervalID(setInterval(takePicture, interval));
      } else {
        if (!recording && intervalId) {
          console.log("stopped", recording, intervalId);
          clearInterval(intervalId);
          setIntervalID(null);
        }
      }
    }
  }, [recording]);

  useEffect(() => {
    if (training) {
      setDetectedLabel("Training");
    } else {
      setDetectedLabel("");
    }
  }, [training]);

  if (!permission) {
    // Camera permissions are still loading
    return <View />;
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: "center" }}>
          We need your permission to show the camera
        </Text>
        <Button onPress={requestPermission} title="grant permission" />
      </View>
    );
  }

  async function takePicture() {
    if (!cameraReady) {
      return;
    }
    const pic = await cameraRef.current?.takePictureAsync({
      base64: true,
    });
    const resizedPic = await manipulateAsync(
      pic.uri,
      [{ resize: { width: 244, height: 244 } }],
      { compress: 1, format: SaveFormat.JPEG, base64: true }
    );

    console.log("HAS CONNECTION", hasConnection);

    hasConnection &&
      socket.current.emit("picture", {
        uri: pic.uri,
        data: resizedPic.base64,
        height: resizedPic.height,
        width: resizedPic.width,
        label,
        stage: training ? "training" : "querying",
      });

    hasConnection &&
      console.log("sending picture", resizedPic.width, resizedPic.height);
  }

  function toggleRecording() {
    setRecording(!recording);
  }

  function toggleCameraType() {
    setType((current) =>
      current === CameraType.back ? CameraType.front : CameraType.back
    );
  }

  return (
    <View style={styles.container}>
      {
        <Camera
          style={styles.camera}
          type={type}
          onCameraReady={() => setCameraReady(true)}
          ref={cameraRef}
        >
          <View style={styles.controls}>
            {training && (
              <TextInput
                value={label}
                onChangeText={(label) => setLabel(label)}
                placeholder={"Label"}
                style={styles.input}
              />
            )}
          </View>
          <Text style={styles.detectedLabel}>
            {hasConnection
              ? detectedLabel
                ? detectedLabel
                : training
                ? "Training"
                : "Unknown"
              : ""}
          </Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.button}
              onPress={() => toggleRecording()}
              disabled={!hasConnection}
            >
              <Text
                style={{
                  ...styles.text,
                  color: recording ? "red" : hasConnection ? "white" : "grey",
                }}
              >
                Rec
              </Text>
              <Switch
                value={training}
                onValueChange={(value) => setTraining(value)}
              />
              <Text style={{ fontSize: 10, color: "white" }}>
                {hasConnection ? "Connected" : "Disconnected"}
              </Text>
            </TouchableOpacity>
          </View>
        </Camera>
      }
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
  },
  camera: {
    flex: 1,
  },
  controls: {
    paddingTop: 70,
    backgroundColor: "transparent",
    display: "flex",
    flexDirection: "column",
    flex: 0.3,
    alignItems: "center",
    justifyContent: "center",
  },
  detectedLabel: {
    flex: 1,
    alignContent: "center",
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
  },
  buttonContainer: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "transparent",
    margin: 64,
  },
  button: {
    flex: 1,
    alignSelf: "flex-end",
    alignItems: "center",
  },
  input: {
    flex: 1,
    flexDirection: "column",
    width: 250,
    height: 44,
    padding: 10,
    marginTop: 20,
    marginBottom: 10,
    backgroundColor: "#e8e8e8",
  },
  text: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    marginBottom: 20,
  },
});
