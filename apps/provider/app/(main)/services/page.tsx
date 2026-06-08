"use client";
import { useSelector } from "react-redux";
import { RootState } from "../../store";
import { DialogModal } from "@veridoctor/design/shared";
import { axiosClient } from "@veridoctor/api-client";
import { toast } from "sonner";
import { useState, useEffect } from "react";

export default function Services() {
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("KES");
  const [description, setDescription] = useState("");
  const [services, setServices] = useState<{id: string; name: string; description: string; estimated_duration: number; currency: string; price: string}[]>([]);
  const userId = useSelector((state: RootState) => state.auth.identity);

  const fetchServices = () => {
    axiosClient
      .get(`provider/${userId}/services`)
      .then((res) => setServices(res.data))
      .catch(() => {});
  };

  useEffect(() => {
    if (userId) fetchServices();
  }, [userId]);

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
          fetchServices();
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
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((service) => (
          <div key={service.id} className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-bold">{service.name}</h3>
            <p className="text-sm text-gray-600">{service.description}</p>
            <p className="text-sm mt-2">{service.estimated_duration} mins • {service.currency} {service.price}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
