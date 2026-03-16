export default function BackgroundWallpaper() {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">

            {/* Top Pink Glow */}
            <div className="absolute top-[5%] -right-[5%] md:right-[5%] w-[400px] md:w-[600px] h-[300px] bg-gradient-to-r from-pink-500 via-rose-500 to-orange-400 rounded-full blur-[80px] opacity-60" />

            {/* Floating Pink Blob */}
            <div className="absolute top-[10%] -right-[15%] md:right-[-5%] w-[600px] h-[280px] bg-gradient-to-r from-pink-500 to-orange-500 rounded-full shadow-2xl animate-float-1 opacity-90" />

            {/* Lime Glow */}
            <div className="absolute top-[35%] -left-[10%] w-[500px] h-[350px] bg-gradient-to-r from-lime-200 to-yellow-300 rounded-[80px] blur-[60px] opacity-50" />

            {/* Floating Lime Blob */}
            <div className="absolute top-[40%] -left-[15%] md:left-[-5%] w-[550px] h-[350px] bg-gradient-to-br from-yellow-200 to-lime-300 rounded-[100px] shadow-xl animate-float-2 opacity-80" />

            {/* Blue Glow */}
            <div className="absolute bottom-[5%] right-[0%] md:right-[15%] w-[500px] h-[300px] bg-gradient-to-r from-cyan-400 to-blue-600 rounded-full blur-[70px] opacity-50" />

            {/* Floating Blue Blob */}
            <div className="absolute -bottom-[5%] -right-[10%] md:right-[10%] w-[650px] h-[300px] bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 rounded-full shadow-2xl animate-float-3 opacity-90" />

        </div>
    );
}
