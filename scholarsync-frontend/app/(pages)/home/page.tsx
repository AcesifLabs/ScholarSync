import {SearchBar} from "@/app/ui/components/SearchBar";

export default function HomePage() {
    return (
        <>
            <header className="flex flex-col gap-3">
                <p className="text-5xl font-bold text-blue-950">Illuminating Knowledge</p>
                <p className="text-xl font-serif italic text-blue-950 max-w-200">Ask ScholarSync anything. Our natural language engine synthesizes over 200 million peer reviewed sources into direct answers</p>
            </header>
            <SearchBar className="rounded-none max-w-4xl" />
        </>
    );
};
