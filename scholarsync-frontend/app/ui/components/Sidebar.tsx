import {CiSearch} from "react-icons/ci";
import {MdOutlineGroups, MdOutlineLocalLibrary} from "react-icons/md";
import {PiFolderStarLight} from "react-icons/pi";
import {FaGoogleScholar} from "react-icons/fa6";
import {FiArchive} from "react-icons/fi";

export default function Sidebar() {
    return (
        <aside className="w-64 shrink-0 p-2 pt-10 flex flex-col overflow-y-auto bg-[#F7FAFC]">
            <p className="cursor-pointer flex items-center gap-3 hover:bg-gray-100 py-5 pl-4"><CiSearch /> Search</p>
            <p className="cursor-pointer flex items-center gap-3 hover:bg-gray-100 py-5 pl-4"><MdOutlineLocalLibrary /> Library</p>
            <p className="cursor-pointer flex items-center gap-3 hover:bg-gray-100 py-5 pl-4"><PiFolderStarLight /> Reading Group</p>
            <p className="cursor-pointer flex items-center gap-3 hover:bg-gray-100 py-5 pl-4"><MdOutlineGroups /> Collections</p>
            <p className="cursor-pointer flex items-center gap-3 hover:bg-gray-100 py-5 pl-4"><FaGoogleScholar /> Researchers</p>
            <p className="cursor-pointer flex items-center gap-3 hover:bg-gray-100 py-5 pl-4"><FiArchive /> Archive</p>
        </aside>
    )
}
