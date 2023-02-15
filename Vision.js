import { Camera, CameraType } from "expo-camera";
import { useState, useEffect, useRef } from "react";
import {
  Button,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  Modal,
} from "react-native";

import { manipulateAsync, FlipType, SaveFormat } from "expo-image-manipulator";
import IconButton from "./components/IconButton";
import { Switch } from "@rneui/themed";
import { ENDPOINT } from "@env";

export default function Vision({ user }) {
  const [type, setType] = useState(CameraType.back);
  const [permission, requestPermission] = Camera.useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [detectedLabel, setDetectedLabel] = useState(null);
  const interval = 1000;
  const [label, setLabel] = useState(null);
  const [detecting, setDetecting] = useState(false);
  const [intervalId, setIntervalID] = useState(0);
  const [confidence, setConfidence] = useState(null);
  const [modalVisible, setModalVisible] = useState(true);
  const [numberOfImages, setNumberOfImages] = useState(0);

  const cameraRef = useRef(null);

  useEffect(() => {
    if (!cameraReady) {
      console.log("camera not ready");
      return;
    } else {
      console.log("camera ready", recording, intervalId);
      if (recording && !intervalId) {
        setIntervalID(setInterval(detectImage, interval));
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
    if (!label) {
      setNumberOfImages(0);
    }
  }, [label]);

  useEffect(() => {
    if (!detecting) {
      setDetectedLabel("Training");
      setRecording(false);
    } else {
      setDetectedLabel("");
      setNumberOfImages(0);
      setRecording(true);
    }
  }, [detecting]);

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

  async function detectImage() {
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

    !detecting && setNumberOfImages((prev) => prev + 1);

    const payload = {
      uri: pic.uri,
      data: resizedPic.base64,
      height: resizedPic.height,
      width: resizedPic.width,
      label,
      user,
      stage: !detecting ? "training" : "detecting",
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

      const resultJson = await result.json();
      const { label, confidence: score } = resultJson;
      label && setDetectedLabel(label);
      score && setConfidence(Math.round(score.toFixed(2) * 100));
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
            {!detecting && (
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

                <Text
                  style={{
                    ...styles.confidence,
                    color: `hsl(140, 100%, ${
                      numberOfImages < 50 ? numberOfImages + 10 : 60
                    }%)`,
                  }}
                >
                  {numberOfImages > 0 && `# of samples: ${numberOfImages}`}
                </Text>
                {numberOfImages > 50 && (
                  <Text
                    style={{
                      ...styles.confidence,
                      color: `hsl(140, 100%, 50%)`,
                    }}
                  >
                    Training complete. Train another label or move to detection
                    mode!
                  </Text>
                )}
              </>
            )}
          </View>
          {detecting && (
            <View style={styles.detectedLabelWrapper}>
              <Text style={styles.detectedLabel}>
                {detectedLabel
                  ? detectedLabel
                  : !detecting
                  ? "Training"
                  : "Waiting for detection"}
              </Text>
              <Text style={styles.confidence}>
                {confidence && `Confidence: ${confidence}%`}
              </Text>
            </View>
          )}
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.button}>
              {!detecting && (
                <IconButton
                  icon="record-circle"
                  color={recording ? "red" : "white"}
                  size={50}
                  onPress={() => toggleRecording()}
                ></IconButton>
              )}
              <Text style={{ padding: 10, color: "white", fontSize: 18 }}>
                {detecting ? "Detection Mode" : "Training Mode"}
              </Text>
              <Switch
                value={detecting}
                onValueChange={(value) => setDetecting(value)}
                label="Detecting"
              />
              <Text style={{ padding: 10, color: "white", fontSize: 12 }}>
                Click to switch between training and detection
              </Text>
            </TouchableOpacity>
          </View>

          <Modal
            animationType="slide"
            transparent={true}
            visible={modalVisible}
          >
            <View style={styles.centeredView}>
              <View style={styles.modalView}>
                <Text style={styles.modalTitle}>
                  Welcome to Pinecone Vision.
                </Text>
                <Text style={styles.modalText}>
                  To get started, set a label and click the record button to
                  start training. Once you have enough training data, click the
                  switch again to put the camera in "detection" mode. Then,
                  point the camera at an object and watch the magic happen! Try
                  it on objects, rooms and even people!
                </Text>

                <Button
                  style={styles.textStyle}
                  title="Get Started"
                  onPress={() => {
                    setModalVisible(false);
                  }}
                ></Button>
              </View>
            </View>
          </Modal>
        </Camera>
      }
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    width: "100%",
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
  detectedLabelWrapper: {
    height: 100,
    marginTop: -100,
    alignContent: "center",
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
  },
  detectedLabel: {
    alignContent: "center",
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
    fontSize: 24,
    marginBottom: 10,
  },
  confidence: {
    flex: 1,
    alignContent: "center",
    fontSize: 12,
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
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalView: {
    width: "90%",
    height: 270,
    backgroundColor: "white",
    borderRadius: 5,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    padding: 30,
  },
  textStyle: {
    color: "black",
    fontWeight: "bold",
    textAlign: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  modalText: {
    marginBottom: 15,
    textAlign: "left",
  },
});
