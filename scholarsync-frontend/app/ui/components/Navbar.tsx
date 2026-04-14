import Link from "next/link";
import {GoogleOAuth, Notifications} from "@/app/ui/components/icons";
import {SearchBar} from "@/app/ui/components/SearchBar";

export default function Navbar() {

    return (
        <nav className="w-full h-14 shrink-0 px-6 md:px-10 bg-[#F7FAFC] flex items-center gap-4">
            {/* Left: Logo */}
            <div className="flex-shrink-0 min-w-55">
                <Link href="/" className="font-bold text-xl whitespace-nowrap">ScholarSync</Link>
            </div>

            {/* Center: Links */}
            <div className="hidden md:flex items-center gap-6 lg:gap-8 flex-1">
                <Link href="/" className="hover:text-white/90 transition-colors">Dashboard</Link>
                <Link href="/" className="hover:text-white/90 transition-colors">Journals</Link>
                <Link href="/" className="hover:text-white/90 transition-colors">Peer Review</Link>
            </div>

            {/* Right: Actions */}
            <div className="flex gap-4 items-center flex-shrink-0">
                <div className="hidden sm:block">
                    <SearchBar />
                </div>
                <Notifications />
                <GoogleOAuth />
            </div>
        </nav>
    )
}
