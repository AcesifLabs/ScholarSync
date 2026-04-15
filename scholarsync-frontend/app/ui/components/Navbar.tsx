import Link from "next/link";
import {GoogleOAuth, Notifications} from "@/app/ui/components/icons";
import {SearchBar} from "@/app/ui/components/SearchBar";

export default function Navbar() {

    return (
        <nav className="w-full h-14 shrink-0 px-6 bg-[#F7FAFC] flex items-center gap-4">
            <div className="flex-shrink-0 min-w-55 p-10 mt-5">
                <Link href="/" className="font-bold text-xl whitespace-nowrap">ScholarSync</Link>
            </div>

            <div className="hidden md:flex items-center gap-6 pl-20 lg:gap-8 flex-1">
                <Link href="/" className="hover:text-blue-400 transition-colors">Dashboard</Link>
                <Link href="/" className="hover:text-blue-400 transition-colors">Journals</Link>
                <Link href="/" className="hover:text-blue-400 transition-colors">Peer Review</Link>
            </div>

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
