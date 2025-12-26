from pydantic import BaseModel, Field, ConfigDict
from fastapi.encoders import jsonable_encoder


class Experience(BaseModel):
  from_years: int | None = Field(default=None, alias="from")
  to_years: int | None = Field(default=None, alias="to")
  model_config = ConfigDict(populate_by_name=True)


class Review(BaseModel):
  experience: Experience | None = None


# Case 1: Data from DB (loaded as object)
exp = Experience(from_years=1, to_years=3)
review = Review(experience=exp)

# Dump as backend would do
dumped = review.model_dump()
print(f"Dumped: {dumped}")

# FastAPI serialization
encoded = jsonable_encoder(review)
print(f"Encoded object: {encoded}")

# Case 2: Dict from backend
dumped_dict = {"experience": {"from_years": 1, "to_years": 3}}
# Validate into response model
response_model = Review(**dumped_dict)
encoded_response = jsonable_encoder(response_model)
print(f"Encoded response: {encoded_response}")
