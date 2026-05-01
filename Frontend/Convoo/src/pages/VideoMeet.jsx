import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { IconButton, Input, TextField, Badge, Button } from "@mui/material";
import {
  CallEnd,
  Videocam,
  VideocamOff,
  Mic,
  MicOff,
  ScreenShare,
  StopScreenShare,
  Chat,
  Troubleshoot,
} from "@mui/icons-material";
import io from "socket.io-client";
import styles from "../styles/VideoComponent.module.css";
import server from "../environment";

const server_url = server;

var connections = {};

const PeerConfigConnections = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

// Component to handle video stream via srcObject
const VideoElement = ({ stream, autoPlay, playsInline, muted }) => {
  const videoRef = useRef();

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay={autoPlay}
      playsInline={playsInline}
      muted={muted}
    />
  );
};

export default function VideoMeetComponent() {
  const navigate = useNavigate();
  var socketRef = useRef();
  let socketIdRef = useRef();
  let localVideoRef = useRef();
  let localStreamRef = useRef();
  let [videoAvailable, setVideoAvailable] = useState(true);
  let [audioAvailable, setAudioAvailable] = useState(true);
  let [video, setVideo] = useState(false);
  let [audio, setAudio] = useState(false);
  let [screen, setScreen] = useState(false);
  let [showModel, setShowModel] = useState(true);
  let [screenAvailable, setScreenAvailable] = useState(false);
  let [messages, setMessages] = useState([]);
  let [message, setMessage] = useState("");
  let [newMessages, setNewMessages] = useState(0);
  let [askForUsername, setAskForUsername] = useState(true);
  let [username, setUsername] = useState("");
  // const videoRef = useRef(); // removed as not needed

  let [videos, setVideos] = useState([]);

  const getPermissions = async () => {
    try {
      const userMediastream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      if (userMediastream) {
        setVideoAvailable(true);
        setAudioAvailable(true);
        localStreamRef.current = userMediastream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = userMediastream;
        }
      }
    } catch (err) {
      console.log(err);
      setVideoAvailable(false);
      setAudioAvailable(false);
    }

    if (navigator.mediaDevices.getDisplayMedia) {
      setScreenAvailable(true);
    } else {
      setScreenAvailable(false);
    }
  };
  useEffect(() => {
    getPermissions();
  }, []); // eslint-disable-line react-hooks/set-state-in-effect

  let getUserMediaSuccess = (stream) => {
    try {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    } catch (err) {
      console.log(err);
    }

    localStreamRef.current = stream;
    localVideoRef.current.srcObject = stream;

    for (let id in connections) {
      if (id === socketIdRef.current) continue;

      connections[id].addStream(localStreamRef.current);
      connections[id].createOffer().then((description) => {
        connections[id]
          .setLocalDescription(description)
          .then(() => {
            socketRef.current.emit(
              "signal",
              id,
              JSON.stringify({ sdp: connections[id].localDescription }),
            );
          })
          .catch((err) => console.log(err));
      });
    }
    stream.getTracks().forEach(
      (track) =>
        (track.onended = () => {
          setVideo(false);
          setAudio(false);

          try {
            let tracks = localVideoRef.current.srcObject.getTracks();
            tracks.forEach((track) => track.stop());
          } catch (err) {
            console.log(err);
          }

          // todo blacksilence
          let blackSilence = (...args) =>
            new MediaStream([black(...args), silence()]);
          localStreamRef.current = blackSilence();
          localVideoRef.current.srcObject = localStreamRef.current;

          for (let id in connections) {
            connections[id].addStream(localStreamRef.current);
            connections[id].createOffer().then((description) => {
              connections[id]
                .setLocalDescription(description)
                .then(() => {
                  socketRef.current.emit(
                    "signal",
                    id,
                    JSON.stringify({ sdp: connections[id].localDescription }),
                  );
                })
                .catch((err) => console.log(err));
            });
          }
        }),
    );
  };

  let silence = () => {
    let ctx = new AudioContext();
    let oscillator = ctx.createOscillator();

    let dst = oscillator.connect(ctx.createMediaStreamDestination());

    oscillator.start();
    ctx.resume();
    return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false });
  };

  let black = ({ width = 640, height = 480 } = {}) => {
    let canvas = Object.assign(document.createElement("canvas"), {
      width,
      height,
    });

    canvas.getContext("2d").fillRect(0, 0, width, height);
    let stream = canvas.captureStream();
    return Object.assign(stream.getVideoTracks()[0], { enabled: false });
  };

  let getUserMedia = async () => {
    if ((video && videoAvailable) || (audio && audioAvailable)) {
      navigator.mediaDevices
        .getUserMedia({ video: video, audio: audio })
        .then(getUserMediaSuccess)
        .catch((err) => console.log(err));
    } else {
      try {
        let tracks = localVideoRef.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
      } catch (err) {
        console.log(err);
      }
    }
  };

  useEffect(() => {
    if (video !== undefined && audio !== undefined) {
      getUserMedia();
    }
  }, [audio, video]); // eslint-disable-line react-hooks/exhaustive-deps

  let gotMessageFromServer = (fromId, message) => {
    var signal = JSON.parse(message);

    if (fromId !== socketIdRef.current) {
      if (signal.sdp) {
        connections[fromId]
          .setRemoteDescription(new RTCSessionDescription(signal.sdp))
          .then(() => {
            if (signal.sdp.type === "offer") {
              connections[fromId]
                .createAnswer()
                .then((description) => {
                  connections[fromId]
                    .setLocalDescription(description)
                    .then(() => {
                      socketRef.current.emit(
                        "signal",
                        fromId,
                        JSON.stringify({
                          sdp: connections[fromId].localDescription,
                        }),
                      );
                    })
                    .catch((err) => console.log(err));
                })
                .catch((err) => console.log(err));
            }
          })
          .catch((err) => console.log(err));
      }
    }
    if (signal.ice) {
      connections[fromId]
        .addIceCandidate(new RTCIceCandidate(signal.ice))
        .catch((err) => console.log(err));
    }
  };

  let addMessage = (data, sender, socketIdSender) => {
    setMessages((prevMessages) => [
      ...prevMessages,
      {sender: sender, data: data}
    ]);

    if(socketIdSender !== socketIdRef.current) {
      setNewMessages((prevMessages) => prevMessages + 1 );
    }
  };

  let connectToSocketServer = () => {
    socketRef.current = io.connect(server_url, { secure: false });
    socketRef.current.on("signal", gotMessageFromServer);
    socketRef.current.on("connect", () => {
      socketRef.current.emit("join-call", window.location.href);
      socketIdRef.current = socketRef.current.id;
      socketRef.current.on("chat-message", addMessage);
      socketRef.current.on("user-left", (id) => {
        setVideos((videos) => videos.filter((video) => video.socketId !== id));
      });
      socketRef.current.on("user-joined", (id, clients) => {
        clients.forEach((socketListId) => {
          connections[socketListId] = new RTCPeerConnection(
            PeerConfigConnections,
          );

          connections[socketListId].onicecandidate = (event) => {
            if (event.candidate !== null) {
              socketRef.current.emit(
                "signal",
                socketListId,
                JSON.stringify({ ice: event.candidate }),
              );
            }
          };
          connections[socketListId].onaddstream = (event) => {
            let newVideo = {
              socketId: socketListId,
              stream: event.stream,
              autoPlay: true,
              playsinline: true,
            };
            setVideos((videos) => {
              // Check if video already exists in current state
              const videoExists = videos.find(
                (video) => video.socketId === socketListId,
              );
              if (videoExists) {
                // Update existing video stream
                return videos.map((video) =>
                  video.socketId === socketListId
                    ? { ...video, stream: event.stream }
                    : video,
                );
              } else {
                // Add new video
                return [...videos, newVideo];
              }
            });
          };

          if (localStreamRef.current !== undefined && localStreamRef.current !== null) {
            connections[socketListId].addStream(localStreamRef.current);
          } else {
            // TODO blacksilence
            let blackSilence = (...args) =>
              new MediaStream([black(...args), silence()]);
            localStreamRef.current = blackSilence();
            connections[socketListId].addStream(localStreamRef.current);
          }
        });

        if (id === socketIdRef.current) {
          for (let id2 in connections) {
            if (id2 === socketIdRef.current) continue;
            try {
              connections[id2].addStream(localStreamRef.current);
            } catch (err) {}
            connections[id2].createOffer().then((description) => {
              connections[id2]
                .setLocalDescription(description)
                .then(() => {
                  socketRef.current.emit(
                    "signal",
                    id2,
                    JSON.stringify({ sdp: connections[id2].localDescription }),
                  );
                })
                .catch((err) => console.log(err));
            });
          }
        }
      });
    });
  };

  let getMedia = () => {
    setVideo(videoAvailable);
    setAudio(audioAvailable);
    connectToSocketServer();
  };

  let toggleVideo = () => {
    if (!videoAvailable) return;
    setVideo((prev) => !prev);
  };

  let toggleAudio = () => {
    if (!audioAvailable) return;
    setAudio((prev) => !prev);
  };

  let endCall = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    setVideos([]);
    setVideo(false);
    setAudio(false);
    setAskForUsername(true);
    try {
      if (localVideoRef.current?.srcObject) {
        localVideoRef.current.srcObject
          .getTracks()
          .forEach((track) => track.stop());
      }
    } catch (err) {
      console.log(err);
    }
    navigate('/home');
  };

  let sendMessage = () => {
    socketRef.current.emit("chat-message", message, username);
    setMessage("");
  }

  let getDisplayMediaSuccess = (stream) => {
    try {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    } catch (err) {
      console.log(err);
    }

    localStreamRef.current = stream;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    for (let id in connections) {
      if (id === socketIdRef.current) continue;
      connections[id].addStream(localStreamRef.current);
      connections[id].createOffer().then((description) => {
        connections[id]
          .setLocalDescription(description)
          .then(() => {
            socketRef.current.emit(
              "signal",
              id,
              JSON.stringify({ sdp: connections[id].localDescription }),
            );
          })
          .catch((err) => console.log(err));
      });
    }
    stream.getTracks().forEach(
      (track) =>
        (track.onended = () => {
          setScreen(false);

          try {
            let tracks = localVideoRef.current.srcObject.getTracks();
            tracks.forEach((track) => track.stop());
          } catch (err) {
            console.log(err);
          }

          // todo blacksilence
          let blackSilence = (...args) =>
            new MediaStream([black(...args), silence()]);
          localStreamRef.current = blackSilence();
          localVideoRef.current.srcObject = localStreamRef.current;

          getUserMedia();
        }),
    );
  };

  let getDisplayMedia = () => {
    if (screen) {
      if (navigator.mediaDevices.getDisplayMedia) {
        navigator.mediaDevices
          .getDisplayMedia({ video: true, audio: false })
          .then(getDisplayMediaSuccess)
          .catch((err) => {
            console.log(err);
            setScreen(false);
          });
      }
    } else {
      try {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      } catch (err) {
        console.log(err);
      }
      getUserMedia();
    }
  };

  useEffect(() => {
    if (screen !== undefined) {
      getDisplayMedia();
    }
  }, [screen]); // eslint-disable-line react-hooks/exhaustive-deps

  let connect = () => {
    setAskForUsername(false);
    getMedia();
  };

  return (
    <div>
      {askForUsername === true ? (
        <div>
          <h1>Enter to Lobby</h1>
          <TextField
            id="outlined-basic"
            label="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            variant="outlined"
          />
          <button variant="contained" onClick={connect}>
            Connect
          </button>

          <div>
            <video ref={localVideoRef} autoPlay muted></video>
          </div>
        </div>
      ) : (
        <div className={styles.meetVideoContainer}>
          {showModel ? (
            <div className={styles.chatRoom}>
              <div className={styles.chatContainer}>
                <div className={styles.chatHeader}>Chat</div>

                <div className={styles.chattingDisplay}>
                  {messages.length > 0 ? (
                    messages.map((item, index) => {
                      return (
                        <div className={styles.chatMessage} key={index}>
                          <div className={styles.chatMessageSender}>{item.sender}</div>
                          <div className={styles.chatMessageText}>{item.data}</div>
                        </div>
                      );
                    })
                  ) : (
                    <p className={styles.chatEmpty}>No messages yet. Say hello!</p>
                  )}
                </div>

                <div className={styles.chattingArea}>
                  <TextField
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    id="outlined-basic"
                    label="Type a message"
                    variant="outlined"
                    className={styles.chatInput}
                    fullWidth
                  />
                  <Button
                    variant="contained"
                    onClick={sendMessage}
                    className={styles.chatSendButton}
                  >
                    Send
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <></>
          )}

          <div className={styles.buttonContainers}>
            <IconButton style={{ color: "white" }} onClick={toggleVideo}>
              {video ? <Videocam /> : <VideocamOff />}
            </IconButton>
            <IconButton style={{ color: "red" }} onClick={endCall}>
              <CallEnd />
            </IconButton>
            <IconButton style={{ color: "white" }} onClick={toggleAudio}>
              {audio === true ? <Mic /> : <MicOff />}
            </IconButton>

            {screenAvailable === true ? (
              <IconButton
                style={{ color: "white" }}
                onClick={() => setScreen((prev) => !prev)}
              >
                {screen === true ? <StopScreenShare /> : <ScreenShare />}
              </IconButton>
            ) : (
              <></>
            )}

            <Badge badgeContent={newMessages} max={999} color="orange">
              <IconButton
                style={{ color: "white" }}
                onClick={() => setShowModel((prev) => !prev)}
              >
                <Chat />
              </IconButton>
            </Badge>
          </div>

          <video
            className={styles.meetUserVideo}
            ref={localVideoRef}
            autoPlay
            muted
          ></video>
          <div className={styles.conferenceView}>
            {videos.map((video) => (
              <div key={video.socketId}>
                <video
                  data-socket={video.socketId}
                  ref={(ref) => {
                    if (ref && video.stream) {
                      ref.srcObject = video.stream;
                    }
                  }}
                  autoPlay
                ></video>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
