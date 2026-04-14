import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export function SearchBar() {
    return (
        <Field orientation="horizontal" className="gap-0">
            <Input type="search" className="py-5 px-4 text-lg bg-[#F7FAFC] border-r-0 rounded-l-full" placeholder="Search..." />
            <Button className="bg-[#F7FAFC] border-gray-200 border-l-0 py-5 px-4 cursor-pointer rounded-r-full text-black">Search</Button>
        </Field>
    )
}
