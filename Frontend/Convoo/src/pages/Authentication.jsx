import { AuthContext } from "../contexts/AuthContext";
import * as React from "react";
import { useContext } from "react";
import {
  Avatar,
  Button,
  CssBaseline,
  TextField,
  Paper,
  Box,
  Typography,
  Snackbar,
} from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import backgroundImage from "../assets/bkp.jpg";

const defaultTheme = createTheme();

export default function Authentication() {
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [name, setName] = React.useState("");
  const [error, setError] = React.useState("");
  const [message, setMessage] = React.useState("");

  const [formState, setFormState] = React.useState(0);
  const [open, setOpen] = React.useState(false);

  const { handleRegister, handleLogin } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleAuth = async () => {
    try {
      if (formState === 0) {
        // Login
        await handleLogin(username, password);
        setMessage("Login successful");
      } else {
        // Signup
        const response = await handleRegister(name, username, password);
        setMessage(response);
      }
      setError("");
      setOpen(true);
      setUsername("");
      setPassword("");
      setName("");
      navigate("/home");
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    }
  };

  const handleClose = () => setOpen(false);

  return (
    <ThemeProvider theme={defaultTheme}>
      <CssBaseline />
      <Box component="main" sx={{ display: "flex", minHeight: "100vh" }}>
        {/* LEFT SIDE (Random Image) */}
        <Box
          sx={{
            display: { xs: "none", sm: "block" },
            width: { sm: "40%", md: "55%" },
            backgroundImage: `url(${backgroundImage})`,
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
            backgroundPosition: "center",
            position: "relative",
            "&::after": {
              content: '""',
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.3)",
            },
          }}
        />

        {/* RIGHT SIDE */}
        <Box component={Paper} elevation={6} sx={{ width: { xs: "100%", sm: "60%", md: "45%" } }}>
          <Box
            sx={{
              minHeight: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              px: 4,
            }}
          >
            <Avatar sx={{ mb: 1, bgcolor: "secondary.main" }}>
              <LockOutlinedIcon />
            </Avatar>

            <Typography variant="h5" mb={2}>
              {formState === 0 ? "Welcome Back 👋" : "Create Account 🚀"}
            </Typography>

            {/* TOGGLE BUTTONS */}
            <Box mb={2}>
              <Button
                variant={formState === 0 ? "contained" : "outlined"}
                sx={{ mr: 1, borderRadius: "20px" }}
                onClick={() => setFormState(0)}
              >
                Log In
              </Button>
              <Button
                variant={formState === 1 ? "contained" : "outlined"}
                sx={{ borderRadius: "20px" }}
                onClick={() => setFormState(1)}
              >
                Sign Up
              </Button>
            </Box>

            <Box sx={{ width: "100%", maxWidth: 350 }}>
              {/* FIXED HEIGHT (no jumping) */}
              <Box sx={{ height: "80px", mt: 1 }}>
                {formState === 1 && (
                  <TextField
                    margin="normal"
                    fullWidth
                    label="Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                )}
              </Box>

              <TextField
                margin="normal"
                fullWidth
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />

              <TextField
                margin="normal"
                fullWidth
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <p style={{ color: "red" }}>{error}</p>

              {/* BUTTON FIX */}
              <Button
                fullWidth
                variant="contained"
                sx={{
                  mt: 2,
                  borderRadius: "20px",
                  background: "linear-gradient(45deg, #6a11cb, #2575fc)",
                }}
                onClick={handleAuth}
              >
                {formState === 0 ? "Login" : "Register"}
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>

      <Snackbar
        open={open}
        autoHideDuration={3000}
        onClose={handleClose}
        message={message}
      />
    </ThemeProvider>
  );
}
