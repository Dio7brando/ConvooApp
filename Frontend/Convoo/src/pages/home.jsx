import React, { useState, useContext } from 'react'
import withAuth from '../utils/withAuth';
import { useNavigate } from 'react-router-dom';
import "../App.css";
import { IconButton, Button, TextField } from '@mui/material';
import RestoreIcon from '@mui/icons-material/Restore';
import { AuthContext } from '../contexts/AuthContext';

function Home() {

  let navigate = useNavigate();
  const [meetingCode, setMeetingCode] = useState("");

  const {addToUserHistory} = useContext(AuthContext);
  let handleJoinVideoCall = async () => {
    await addToUserHistory(meetingCode);
    navigate(`/${meetingCode}`);
  }

  return (
    <>
    <div className="navBar">
      <div style={{ display: "flex", alignItems: "center"}}>
        <h2>Convoo</h2>
      </div>
      <div style={{display: "flex", alignItems:"center"}}>

        <IconButton onClick={ () => navigate("/history")}>
          <RestoreIcon />
        </IconButton>
        <p>History</p>

        <Button onClick={ () => {
          localStorage.removeItem("token");
          navigate("/auth");
        }}>
          Logout
        </Button>

      </div>
    </div>

    <div className="meetContainer">
      <div className="leftPanel">
        <div>
        <h2>Providing Quality Video Calls and Chats</h2>

        <div style={{display: `flex`, gap: "10px", alignItems: "center", flexWrap: "wrap"}}>

          <TextField
            onChange={(e) => setMeetingCode(e.target.value)}
            id="outlined-basic"
            label="Meeting Code"
            variant="outlined"
            sx={{ minWidth: 250, backgroundColor: "rgba(255,255,255,0.95)", borderRadius: 2 }}
          />
          <Button
            variant="contained"
            onClick={handleJoinVideoCall}
            sx={{
              background: "linear-gradient(45deg, #D97500, #FF9839)",
              color: "white",
              borderRadius: "20px",
              px: 4,
              py: 1.5,
              boxShadow: "0 10px 25px rgba(217,117,0,0.25)",
              '&:hover': {
                background: "linear-gradient(45deg, #FF9839, #D97500)",
              },
            }}
          >
            Join
          </Button>
        </div>
      </div>
    </div>
    <div className="rightPanel">
      <img srcSet = "/logo.png" alt="" />
    </div>
  </div>
    </>
  )
}

export default withAuth(Home);