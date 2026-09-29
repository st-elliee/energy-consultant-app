from sqlalchemy import (
    Column, Integer, String, Text, Date, DateTime, DECIMAL,
    ForeignKey, Enum, func
)
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), nullable=False, unique=True)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime, server_default=func.now())


class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(75), nullable=False)
    last_name = Column(String(75), nullable=False)
    phone = Column(String(20), nullable=False)
    email = Column(String(150))
    afm = Column(String(20))
    notes = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    contracts = relationship("Contract", back_populates="client", cascade="all, delete-orphan")
    files = relationship("FileRecord", back_populates="client", cascade="all, delete-orphan")


class Contract(Base):
    __tablename__ = "contracts"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    contract_type = Column(Enum("ρεύμα", "αέριο", "ίντερνετ", name="contract_type_enum"), nullable=False)
    provider = Column(String(100), nullable=False)
    address = Column(String(255))
    tariff_name = Column(String(150))
    pricing_type = Column(String(50))   # "Σταθερό" ή "Κυμαινόμενο"
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    status = Column(
        Enum("ενεργό", "προς_ανανέωση", "έληξε", "ακυρώθηκε", name="contract_status_enum"),
        default="ενεργό"
    )
    monthly_estimate = Column(DECIMAL(10, 2))
    notes = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    client = relationship("Client", back_populates="contracts")
    files = relationship("FileRecord", back_populates="contract")
    history = relationship("ContractHistory", back_populates="contract", cascade="all, delete-orphan")


class FileRecord(Base):
    __tablename__ = "files"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    contract_id = Column(Integer, ForeignKey("contracts.id", ondelete="SET NULL"))
    file_type = Column(Enum("λογαριασμός", "ταυτότητα", "εξουσιοδότηση", "μισθωτήριο", "άλλο", name="file_type_enum"), nullable=False)
    file_path = Column(String(500), nullable=False)
    original_name = Column(String(255))
    uploaded_at = Column(DateTime, server_default=func.now())

    client = relationship("Client", back_populates="files")
    contract = relationship("Contract", back_populates="files")


class ContractHistory(Base):
    __tablename__ = "contract_history"

    id = Column(Integer, primary_key=True, index=True)
    contract_id = Column(Integer, ForeignKey("contracts.id", ondelete="CASCADE"), nullable=False)
    previous_provider = Column(String(100))
    previous_tariff = Column(String(150))
    previous_end_date = Column(Date)
    change_reason = Column(String(255))
    changed_at = Column(DateTime, server_default=func.now())

    contract = relationship("Contract", back_populates="history")