"use client";
import { useSelector } from "react-redux";
import { RootState } from "../../store";
import { DialogModal } from "@veridoctor/design/shared";
import { axiosClient } from "@veridoctor/api-client";
import { toast } from "sonner";
import { useState, useEffect, useRef } from "react";

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
  const [deletingService, setDeletingService] = useState<Service | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const userId = useSelector((state: RootState) => state.auth.identity);

  const fetchServices = () => {
    axiosClient
      .get(`provider/${userId}/services`)
      .then((res) => setServices(res.data))
      .catch(() => {});
  };

  useEffect(() => {
    if (userId) fetchServices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSave = () => {
    axiosClient
      .post(`provider/${userId}/services`, {
        name, estimated_duration: duration, price, currency, description,
      })
      .then((res) => {
        if (res.status === 201) {
          toast.success("Service added successfully");
          fetchServices();
        }
      })
      .catch(() => toast.error("There was a problem adding the service"));
  };

  const handleUpdate = () => {
    if (!editingService) return;
    axiosClient
      .patch(`provider/${userId}/services/${editingService.id}`, {
        name, estimated_duration: duration, price, currency, description,
      })
      .then((res) => {
        if (res.status === 200) {
          toast.success("Service updated successfully");
          setEditingService(null);
          setShowEditModal(false);
          fetchServices();
        }
      })
      .catch(() => toast.error("Could not update service"));
  };

  const handleDelete = () => {
    if (!deletingService) return;
    axiosClient
      .delete(`provider/${userId}/services/${deletingService.id}`)
      .then(() => {
        toast.success("Service deleted");
        setDeletingService(null);
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
    setShowEditModal(true);
    setOpenMenuId(null);
  };

  return (
    <div className="p-4 bg-white rounded-lg mx-4">
      {deletingService && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="font-bold text-lg mb-2">Delete service?</h3>
            <p className="text-gray-600 text-sm mb-6">Are you sure you want to delete <span className="font-medium">{deletingService.name}</span>? This action cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeletingService(null)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleDelete} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && editingService && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="font-bold text-lg mb-4">Edit service</h3>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-sm font-medium">Name of service</label>
                <input defaultValue={editingService.name} onChange={(e) => setName(e.target.value)} className="w-full p-2 border border-gray-300 rounded mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Estimated duration (minutes)</label>
                <input defaultValue={editingService.estimated_duration} onChange={(e) => setDuration(e.target.value)} type="number" className="w-full p-2 border border-gray-300 rounded mt-1" />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium">Price</label>
                  <input defaultValue={editingService.price} onChange={(e) => setPrice(e.target.value)} className="w-full p-2 border border-gray-300 rounded mt-1" />
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium">Currency</label>
                  <input defaultValue={editingService.currency} onChange={(e) => setCurrency(e.target.value)} className="w-full p-2 border border-gray-300 rounded mt-1" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <textarea defaultValue={editingService.description} onChange={(e) => setDescription(e.target.value)} className="w-full p-2 border border-gray-300 rounded mt-1" />
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => { setShowEditModal(false); setEditingService(null); }} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleUpdate} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save changes</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold">Service catalog</h1>
          <p className="text-gray-600 mt-1">Manage services.</p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((service) => (
          <div key={service.id} className="border border-gray-200 rounded-lg p-4 relative">
            <div className="absolute top-3 right-3" ref={openMenuId === service.id ? menuRef : null}>
              <button
                onClick={() => setOpenMenuId(openMenuId === service.id ? null : service.id)}
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500"
              >
                ···
              </button>
              {openMenuId === service.id && (
                <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[120px]">
                  <button onClick={() => handleEdit(service)} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Edit</button>
                  <button onClick={() => { setDeletingService(service); setOpenMenuId(null); }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">Delete</button>
                </div>
              )}
            </div>
            <h3 className="font-bold pr-8">{service.name}</h3>
            <p className="text-sm text-gray-600 mt-1">{service.description}</p>
            <p className="text-sm mt-2 text-gray-500">{service.estimated_duration} mins • {service.currency} {service.price}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
