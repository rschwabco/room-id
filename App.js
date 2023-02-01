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
import { manipulateAsync, FlipType, SaveFormat } from "expo-image-manipulator";
import IconButton from "./components/IconButton";
import { Switch } from "@rneui/themed";
import { ENDPOINT } from "@env";

export default function App() {
  console.log("ENDPOINT", ENDPOINT);
  const [type, setType] = useState(CameraType.back);
  const [permission, requestPermission] = Camera.useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [detectedLabel, setDetectedLabel] = useState(null);
  const interval = 2000;
  const [label, setLabel] = useState(null);
  const [training, setTraining] = useState(false);
  const [intervalId, setIntervalID] = useState(0);

  const cameraRef = useRef(null);

  useEffect(() => {
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
      { compress: 0.4, format: SaveFormat.JPEG, base64: true }
    );

    const payload = {
      uri: pic.uri,
      data: resizedPic.base64,
      height: resizedPic.height,
      width: resizedPic.width,
      label,
      stage: training ? "training" : "querying",
    };

    try {
      const result = await fetch(`${ENDPOINT}/api/image`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const { label } = await result.json();
      setDetectedLabel(label);
    } catch (e) {
      console.log("Failed", e);
    }
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
              <>
                <Text style={{ padding: 10, color: "white", fontSize: 14 }}>
                  Set the label and click the record button to start training
                </Text>
                <TextInput
                  value={label}
                  onChangeText={(label) => setLabel(label)}
                  placeholder={"Label"}
                  style={styles.input}
                />
              </>
            )}
          </View>
          {!training && (
            <Text style={styles.detectedLabel}>
              {detectedLabel
                ? detectedLabel
                : training
                ? "Training"
                : "Unknown"}
            </Text>
          )}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.button}
              // onPress={() => toggleRecording()}
            >
              <IconButton
                icon="record-circle"
                color={recording ? "red" : "white"}
                size={50}
                onPress={() => toggleRecording()}
              ></IconButton>
              <Text style={{ padding: 10, color: "white", fontSize: 18 }}>
                {training ? "Training" : "Detecting"}
              </Text>
              <Switch
                value={training}
                onValueChange={(value) => setTraining(value)}
                label="Training"
              />
              <Text style={{ padding: 10, color: "white", fontSize: 12 }}>
                Click to switch between detection and training
              </Text>
            </TouchableOpacity>
          </View>
          {/* <View style={styles.buttonContainer}>

          </View> */}
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
    width: "90%",
    fontSize: 24,
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
