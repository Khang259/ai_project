import loginVideo from "@/assets/vid_landingpages.mp4"
import { useEffect, useRef } from "react"
import { LoginForm } from "@/components/Login-form/login-form"

export default function LoginPage() {
  const videoRef = useRef(null)

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.3
    }
  }, [])
  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Login Form */}
      <div className="flex-1 relative flex p-16 overflow-hidden">
        {/* Video nền */}
        <video
          src={loginVideo}
          autoPlay
          loop
          muted
          playsInline
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover z-0"
        />
        {/* Overlay mờ trên video */}
        <div className="absolute inset-0 z-10"></div>
        {/* Nội dung form */}
        <div className="w-full max-w-md z-10">
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
