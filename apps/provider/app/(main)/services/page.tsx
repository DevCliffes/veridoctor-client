"use client";
import { useSelector } from "react-redux";
import { RootState } from "../../store";
import { DialogModal } from "@veridoctor/design/shared";
import { axiosClient } from "@veridoctor/api-client";
import { toast } from "sonner";
import { useState, useEffect } from "react";

type Service = {
  id: string;
  name: string;
  description: string;
  estimated_duration: number;
  currency: string;
  price: string;
};

export default function Services() {
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("KES");
  const [description, setDescription] = useState("");
  const [services, setServices] = useState<Service[]>([]);
  const [editingService, setEditingService] = useState<Service | null>(null);
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
    const request = editingService
      ? axiosClient.patch(`provider/${userId}/services/${editingService.id}`, {
          name, estimated_duration: duration, price, currency, description,
        })
      : axiosClient.post(`provider/${userId}/services`, {
          name, estimated_duration: duration, price, currency, description,
        });

    request
      .then((res) => {
        if (res.status === 201 || res.status === 200) {
          toast.success(editingService ? "Service updated successfully" : "Service added successfully");
          setEditingService(null);
          fetchServices();
        }
      })
      .catch(() => {
        toast.error("There was a problem saving the service");
      });
  };

  const handleDelete = (serviceId: string) => {
    axiosClient
      .delete(`provider/${userId}/services/${serviceId}`)
      .then(() => {
        toast.success("Service deleted");
        fetchServices();
      })
      .catch(() => toast.error("Could not delete service"));
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setName(service.name);
    setDuration(String(service.estimated_duration));
    setPrice(service.price);
    setCurrency(service.currency);
    setDescription(service.description);
  };

  return (
    <div className="p-4 bg-white rounded-lg mx-4">
      <div className="flex justify-between">
        <div>
          <h1 className="text-xl font-bold">Service catalog</h1>
          <p className="text-gray-600 mt-2">Manage services.</p>
        </div>
        <DialogModal
          title={editingService ? "Edit service" : "Add a new service"}
          description="Add a new service to your service listing"
          trigger={<p>Add service</p>}
          onSave={handleSave}
        >
          <div className="flex flex-col gap-2">
            <label>Name of service</label>
            <input defaultValue={editingService?.name} onChange={(e) => setName(e.target.value)} className="w-full p-2 border border-gray-300 rounded" />
            <label>Estimated duration (minutes)</label>
            <input defaultValue={editingService?.estimated_duration} onChange={(e) => setDuration(e.target.value)} type="number" className="w-full p-2 border border-gray-300 rounded" />
            <div className="flex gap-4">
              <div className="flex-1">
                <label>Price</label>
                <input defaultValue={editingService?.price} onChange={(e) => setPrice(e.target.value)} className="w-full p-2 border border-gray-300 rounded" />
              </div>
              <div className="flex-1">
                <label>Currency</label>
                <input defaultValue={editingService?.currency ?? "KES"} onChange={(e) => setCurrency(e.target.value)} className="w-full p-2 border border-gray-300 rounded" />
              </div>
            </div>
            <label>Description</label>
            <textarea defaultValue={editingService?.description} onChange={(e) => setDescription(e.target.value)} className="w-full p-2 border border-gray-300 rounded" />
          </div>
        </DialogModal>
      </div>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((service) => (
          <div key={service.id} className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-bold">{service.name}</h3>
            <p className="text-sm text-gray-600">{service.description}</p>
            <p className="text-sm mt-2">{service.estimated_duration} mins • {service.currency} {service.price}</p>
            <div className="flex gap-2 mt-3">
              <button onClick={() => handleEdit(service)} className="text-xs px-3 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100">Edit</button>
              <button onClick={() => handleDelete(service.id)} className="text-xs px-3 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
