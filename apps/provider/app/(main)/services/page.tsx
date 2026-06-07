"use client";
import { useSelector } from "react-redux";
import { RootState } from "../../store";
import { DialogModal } from "@veridoctor/design/shared";
import { axiosClient } from "@veridoctor/api-client";
import { toast } from "sonner";
import { useState } from "react";

export default function Services() {
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("KES");
  const [description, setDescription] = useState("");
  const userId = useSelector((state: RootState) => state.auth.user);

  const handleSave = () => {
    axiosClient
      .post(`provider/${userId}/services`, {
        name,
        estimated_duration: duration,
        price,
        currency,
        description,
      })
      .then((res) => {
        if (res.status === 201) {
          toast.success("Service added successfully");
        }
      })
      .catch(() => {
        toast.error("There was a problem adding the service");
      });
  };

  return (
    <div className="p-4 bg-white rounded-lg mx-4">
      <div className="flex justify-between">
        <div>
          <h1 className="text-xl font-bold">Service catalog</h1>
          <p className="text-gray-600 mt-2">Manage services.</p>
        </div>
        <DialogModal
          title="Add a new service"
          description="Add a new service to your service listing"
          trigger={<p>Add service</p>}
          onSave={handleSave}
        >
          <div className="flex flex-col gap-2">
            <label>Name of service</label>
            <input onChange={(e) => setName(e.target.value)} className="w-full p-2 border border-gray-300 rounded" />
            <label>Estimated duration (minutes)</label>
            <input onChange={(e) => setDuration(e.target.value)} type="number" className="w-full p-2 border border-gray-300 rounded" placeholder="An estimated duration this service will take" />
            <div className="flex gap-4">
              <div className="flex-1">
                <label>Price</label>
                <input onChange={(e) => setPrice(e.target.value)} className="w-full p-2 border border-gray-300 rounded" />
              </div>
              <div className="flex-1">
                <label>Currency</label>
                <input onChange={(e) => setCurrency(e.target.value)} defaultValue="KES" className="w-full p-2 border border-gray-300 rounded" />
              </div>
            </div>
            <label>Description</label>
            <textarea onChange={(e) => setDescription(e.target.value)} className="w-full p-2 border border-gray-300 rounded" />
          </div>
        </DialogModal>
      </div>
    </div>
  );
}
